import os
import csv
import io
import json
import pickle
import random
import requests
import numpy as np
from html import escape
from flask import Flask, render_template, request, jsonify, make_response, session, redirect, url_for
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
load_dotenv()
import pdfplumber

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'question_bank_secret_key')

# Groq API Configuration
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Allowed extensions
ALLOWED_EXTENSIONS = {'csv', 'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ============= LSTM Model for Previous Year Papers =============
class SimpleLSTMAnalyzer:
    def __init__(self):
        self.vocab = {}
        self.question_patterns = []
        
    def build_vocab(self, questions):
        words = set()
        for q in questions:
            words.update(q.get('question', '').lower().split())
            words.update([q.get('rbt_level', '').lower()])
            words.update([q.get('difficulty', '').lower()])
            words.update([q.get('co', '').lower()])
        self.vocab = {word: i+1 for i, word in enumerate(words)}
        return self.vocab
    
    def extract_features(self, question):
        features = []
        q_text = question.get('question', '').lower()
        for word in sorted(self.vocab.keys())[:100]:
            features.append(1 if word in q_text else 0)
        rbt_map = {'remembering': 0, 'understanding': 1, 'applying': 2, 'analyzing': 3, 'evaluating': 4, 'creating': 5}
        diff_map = {'easy': 0, 'medium': 1, 'hard': 2}
        rbt_val = rbt_map.get(q.get('rbt_level', '').lower(), 0)
        diff_val = diff_map.get(q.get('difficulty', '').lower(), 0)
        features.extend([rbt_val/5, diff_val/2])
        return np.array(features[:50])
    
    def calculate_similarity(self, q1_features, q2_features):
        if len(q1_features) != len(q2_features):
            return 0
        dot_product = np.dot(q1_features, q2_features)
        norm1 = np.linalg.norm(q1_features)
        norm2 = np.linalg.norm(q2_features)
        if norm1 == 0 or norm2 == 0:
            return 0
        return dot_product / (norm1 * norm2)
    
    def is_duplicate(self, new_question, existing_questions, threshold=0.7):
        if not existing_questions or not self.vocab:
            return False
        new_features = self.extract_features(new_question)
        for existing in existing_questions:
            existing_features = self.extract_features(existing)
            similarity = self.calculate_similarity(new_features, existing_features)
            if similarity > threshold:
                return True
        return False
    
    def train(self, questions):
        self.build_vocab(questions)
        self.question_patterns = questions
        return True

lstm_model = SimpleLSTMAnalyzer()

# ============= Helper Functions =============

def extract_text_from_pdf(pdf_file):
    text = ""
    try:
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
    except Exception as e:
        print(f"Error extracting PDF: {e}")
    return text

def parse_csv_questions(csv_file):
    questions = []
    try:
        if hasattr(csv_file, 'read'):
            content = csv_file.read().decode('utf-8')
            reader = csv.DictReader(io.StringIO(content))
        else:
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
        
        for row in reader:
            normalized_row = {
                'question': row.get('Question', row.get('question', '')),
                'marks': int(row.get('Marks', row.get('marks', 5))),
                'rbt_level': row.get('RBT Level', row.get('rbt_level', 'Understanding')),
                'difficulty': row.get('Difficulty Level', row.get('Difficulty', row.get('difficulty', 'Medium'))),
                'co': row.get('Course Outcomes', row.get('CO', row.get('co', 'CO1'))),
                'topic': row.get('Topic Name', row.get('Topic', row.get('topic', ''))),
                'unit': int(row.get('Unit Name', row.get('Unit', 1))),
                'question_type': row.get('Type', row.get('type', 'Theory'))
            }
            questions.append(normalized_row)
    except Exception as e:
        print(f"Error parsing CSV: {e}")
    return questions

def select_questions_by_distribution(questions, num_questions, difficulty_pct, rbt_pct, question_type=None):
    if not questions:
        return []
    if question_type and question_type != 'both':
        filtered = [q for q in questions if q.get('question_type', 'Theory').lower() == question_type.lower()]
        if filtered:
            questions = filtered
    
    easy_q = [q for q in questions if q.get('difficulty', '').lower() in ['easy', 'e']]
    medium_q = [q for q in questions if q.get('difficulty', '').lower() in ['medium', 'm']]
    hard_q = [q for q in questions if q.get('difficulty', '').lower() in ['hard', 'h']]
    
    easy_count = int(num_questions * difficulty_pct.get('easy', 0.33))
    medium_count = int(num_questions * difficulty_pct.get('medium', 0.34))
    hard_count = num_questions - easy_count - medium_count
    
    selected = []
    if easy_q:
        random.shuffle(easy_q)
        selected.extend(easy_q[:easy_count])
    if medium_q:
        random.shuffle(medium_q)
        selected.extend(medium_q[:medium_count])
    if hard_q:
        random.shuffle(hard_q)
        selected.extend(hard_q[:hard_count])
    
    remaining = [q for q in questions if q not in selected]
    random.shuffle(remaining)
    
    while len(selected) < num_questions and remaining:
        selected.append(remaining.pop())
    
    random.shuffle(selected)
    return selected[:num_questions]

def generate_questions_ai(textbook_text, syllabus_text, num_questions, question_type):
    prompt = f"""Generate {num_questions} exam questions based on:
SYLLABUS: {syllabus_text[:3000]}
TEXTBOOK: {textbook_text[:4000]}

MARKS: Mix 5,8,10,12,15 marks (total ~{num_questions*8})
DIFFICULTY: 1/3 easy, 1/3 medium, 1/3 hard
RBT: remembering, understanding, applying, analyzing, evaluating, creating (equal)
CO1-CO5 equal, Units 1-5 equal

JSON array format:
[{{"question": "...", "marks": 10, "rbt_level": "applying", "difficulty": "medium", "co": "CO3", "topic": "NLP Pipeline", "unit": 2, "question_type": "{question_type}"}}]"""

    try:
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
        payload = {"model": "llama-3.1-8b-instant", "messages": [{"role": "user", "content": prompt}], "temperature": 0.3}
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=120)
        response.raise_for_status()
        content = response.json()['choices'][0]['message']['content']
        start = content.find('[')
        end = content.rfind(']') + 1
        if start != -1:
            questions = json.loads(content[start:end])
            return questions
    except:
        pass
    return []

# Routes (unchanged...)
@app.route('/')
def index():
    return render_template('login.html')

# ... (rest same as original)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
