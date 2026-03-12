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
import os
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
        rbt_val = rbt_map.get(question.get('rbt_level', '').lower(), 0)
        diff_val = diff_map.get(question.get('difficulty', '').lower(), 0)
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
            content = csv_file.read().decode('utf-8', errors='ignore')
            lines = []
            for line in content.splitlines():
                if not line.strip():
                    continue
                if line.lstrip().startswith('#'):
                    continue
                lines.append(line)
            if not lines:
                return []
            reader = csv.DictReader(io.StringIO("\n".join(lines)))
        else:
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    questions.append(row)
            return questions
        
        for row in reader:
            def safe_int(value, default):
                try:
                    return int(str(value).strip())
                except Exception:
                    return default

            normalized_row = {
                'question': row.get('Question', row.get('question', '')),
                'marks': safe_int(row.get('Marks', row.get('marks', 5)), 5),
                'rbt_level': row.get('RBT Level', row.get('rbt_level', row.get('RBT', 'Understanding'))),
                'difficulty': row.get('Difficulty Level', row.get('Difficulty', row.get('difficulty', 'Medium'))),
                'co': row.get('CO', row.get('co', row.get('Course Outcomes', row.get('Course Outcome', 'CO1')))),
                'topic': row.get('Topic', row.get('topic', row.get('Topic Name', ''))),
                'unit': safe_int(row.get('Unit', row.get('unit', row.get('Unit Name', 1))), 1),
                'question_type': row.get('Type', row.get('type', row.get('Question Type', 'Theory')))
            }
            if str(normalized_row.get('question', '')).strip():
                questions.append(normalized_row)
    except Exception as e:
        print(f"Error parsing CSV: {e}")
    return questions

def _equal_bucket_counts(total, buckets):
    base = total // len(buckets)
    remainder = total % len(buckets)
    counts = {b: base for b in buckets}
    for i in range(remainder):
        counts[buckets[i]] += 1
    return counts

def enforce_marks_distribution(questions, num_questions, mark_values=(1, 5, 10)):
    counts = _equal_bucket_counts(num_questions, list(mark_values))
    remaining = list(questions)
    random.shuffle(remaining)
    selected = []

    for mark in mark_values:
        matching = [q for q in remaining if int(q.get('marks', 0)) == mark]
        random.shuffle(matching)
        take = min(counts[mark], len(matching))
        chosen = matching[:take]
        selected.extend(chosen)
        chosen_ids = set(id(q) for q in chosen)
        remaining = [q for q in remaining if id(q) not in chosen_ids]
        counts[mark] -= take

    # Fill any shortages by reassigning marks to keep equal distribution.
    for mark in mark_values:
        need = counts[mark]
        if need <= 0:
            continue
        take = min(need, len(remaining))
        chosen = remaining[:take]
        remaining = remaining[take:]
        for q in chosen:
            q['marks'] = mark
        selected.extend(chosen)
        counts[mark] -= take

    while len(selected) < num_questions and remaining:
        selected.append(remaining.pop())

    random.shuffle(selected)
    return selected[:num_questions]

def select_questions_by_distribution(questions, num_questions, difficulty_pct, rbt_pct, question_type=None):
    if question_type and question_type != 'both':
        filtered = [q for q in questions if q.get('question_type', 'Theory').lower() == question_type.lower()]
        if filtered:
            questions = filtered
    
    easy_q = [q for q in questions if q.get('difficulty', 'Medium').lower() == 'easy']
    medium_q = [q for q in questions if q.get('difficulty', 'Medium').lower() == 'medium']
    hard_q = [q for q in questions if q.get('difficulty', 'Medium').lower() == 'hard']
    
    easy_count = int(num_questions * difficulty_pct.get('easy', 0.33))
    medium_count = int(num_questions * difficulty_pct.get('medium', 0.34))
    hard_count = num_questions - easy_count - medium_count
    
    selected = []
    random.shuffle(easy_q)
    selected.extend(easy_q[:easy_count])
    random.shuffle(medium_q)
    selected.extend(medium_q[:medium_count])
    random.shuffle(hard_q)
    selected.extend(hard_q[:hard_count])
    
    all_selected_ids = set(id(q) for q in selected)
    remaining = [q for q in questions if id(q) not in all_selected_ids]
    random.shuffle(remaining)
    
    while len(selected) < num_questions and remaining:
        selected.append(remaining.pop())
    
    random.shuffle(selected)
    return selected[:num_questions]

def generate_questions_ai(textbook_text, syllabus_text, num_questions, question_type):
    mark_counts = _equal_bucket_counts(num_questions, [1, 5, 10])
    easy_count = num_questions // 3
    medium_count = num_questions // 3
    hard_count = num_questions - easy_count - medium_count
    rbt_per_level = num_questions // 6
    co_per_course = num_questions // 5
    unit_per_unit = num_questions // 5
    
    prompt = f"""You are an expert question generator. Generate exactly {num_questions} questions with EQUAL DISTRIBUTION.

SYLLABUS: {syllabus_text[:3000]}
TEXTBOOK: {textbook_text[:4000]}
Question Type: {question_type}

REQUIRED: {easy_count} Easy, {medium_count} Medium, {hard_count} Hard.
MARKS: {mark_counts[1]} questions of 1 mark, {mark_counts[5]} questions of 5 marks, {mark_counts[10]} questions of 10 marks.
RBT: Equal distribution across 6 levels.
CO: Equal distribution across CO1-CO5.
Units: Equal distribution across 5 units.

Return JSON array with: question, marks, rbt_level, difficulty, co, topic, unit, question_type"""

    try:
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
        payload = {"model": "llama-3.1-8b-instant", "messages": [{"role": "user", "content": prompt}], "temperature": 0.7, "max_tokens": 4000}
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        content_type = response.headers.get('content-type', '')
        if 'application/json' not in content_type:
            raise ValueError(f"Unexpected response type: {content_type}. Status: {response.status_code}")
        data = response.json()
        response_text = data['choices'][0]['message']['content']
        start_idx = response_text.find('[')
        end_idx = response_text.rfind(']') + 1
        if start_idx != -1 and end_idx != 0:
            json_str = response_text[start_idx:end_idx]
            questions = json.loads(json_str)
            return enforce_marks_distribution(questions, num_questions, (1, 5, 10))
        else:
            raise ValueError("No JSON found")
    except Exception as e:
        print(f"Error generating questions: {e}")
        return []

# ============= Routes =============

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/index')
def home():
    return render_template('index.html')

@app.route('/question_bank')
def question_bank():
    return render_template('question_bank.html')

@app.route('/generate', methods=['POST'])
def generate_question_bank():
    try:
        if not GROQ_API_KEY:
            return jsonify({'error': 'GROQ_API_KEY is not set on the server. Please add it in Render Environment Variables.'}), 500

        textbook = request.files.get('textbook')
        syllabus = request.files.get('syllabus')
        num_questions = int(request.form.get('num_questions', 20))
        question_type = request.form.get('question_type', 'Theory')
        
        if not textbook or not syllabus:
            return jsonify({'error': 'Please upload both PDFs'}), 400
        
        textbook_path = os.path.join(UPLOAD_FOLDER, 'textbook.pdf')
        syllabus_path = os.path.join(UPLOAD_FOLDER, 'syllabus.pdf')
        textbook.save(textbook_path)
        syllabus.save(syllabus_path)
        
        textbook_text = extract_text_from_pdf(textbook_path)
        syllabus_text = extract_text_from_pdf(syllabus_path)
        
        if not textbook_text or not syllabus_text:
            return jsonify({'error': 'Could not extract text from PDFs'}), 400
        
        questions = generate_questions_ai(textbook_text, syllabus_text, num_questions, question_type)
        
        if not questions:
            return jsonify({'error': 'Failed to generate questions'}), 500
        
        for q in questions:
            q.setdefault('question', '')
            q.setdefault('marks', 5)
            q.setdefault('rbt_level', 'Understanding')
            q.setdefault('difficulty', 'Medium')
            q.setdefault('co', 'CO1')
            q.setdefault('topic', '')
            q.setdefault('unit', 1)
            q.setdefault('question_type', 'Theory')
        
        return jsonify({'questions': questions})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/step1', methods=['GET', 'POST'])
def step1_upload():
    if request.method == 'POST':
        if 'csv_file' not in request.files:
            return render_template('upload.html', error='Please upload a CSV file')
        csv_file = request.files['csv_file']
        if csv_file.filename == '':
            return render_template('upload.html', error='Please select a file')
        if csv_file and allowed_file(csv_file.filename):
            questions = parse_csv_questions(csv_file)
            if not questions:
                return render_template('upload.html', error='No valid questions found')
            session['all_questions'] = questions
            session['step'] = 1
            return redirect(url_for('step2_configure'))
    return render_template('upload.html')

@app.route('/step2', methods=['GET', 'POST'])
def step2_configure():
    if 'all_questions' not in session:
        return redirect(url_for('step1_upload'))
    if request.method == 'POST':
        num_questions = int(request.form.get('num_questions', 10))
        question_type = request.form.get('question_type', 'both')
        session['num_questions'] = num_questions
        session['question_type'] = question_type
        session['step'] = 2
        return redirect(url_for('step3_options'))
    return render_template('configure.html', questions_count=len(session.get('all_questions', [])), num_questions=session.get('num_questions', 10), question_type=session.get('question_type', 'both'))

@app.route('/step3', methods=['GET', 'POST'])
def step3_options():
    if 'num_questions' not in session:
        return redirect(url_for('step2_configure'))
    if request.method == 'POST':
        header_info = {'college_name': request.form.get('college_name', ''), 'course_name': request.form.get('course_name', ''), 'course_code': request.form.get('course_code', '')}
        generation_mode = request.form.get('generation_mode', 'auto')
        session['header_info'] = header_info
        session['generation_mode'] = generation_mode
        session['step'] = 3
        if generation_mode == 'auto':
            return redirect(url_for('step4_generate'))
        else:
            return redirect(url_for('step5_custom'))
    return render_template('options.html')

@app.route('/step4', methods=['GET', 'POST'])
def step4_generate():
    if 'num_questions' not in session:
        return redirect(url_for('step2_configure'))
    if request.method == 'POST':
        previous_papers = request.files.getlist('previous_papers')
        previous_questions = []
        if previous_papers and previous_papers[0].filename:
            for pdf in previous_papers:
                if pdf.filename:
                    text = extract_text_from_pdf(pdf)
                    previous_questions.append({'text': text})
            lstm_model.train(previous_questions)
        
        all_questions = session.get('all_questions', [])
        num_questions = session.get('num_questions', 10)
        question_type = session.get('question_type', 'both')
        difficulty_pct = {'easy': 0.33, 'medium': 0.34, 'hard': 0.33}
        rbt_pct = {'remembering': 0.17, 'understanding': 0.17, 'applying': 0.17, 'analyzing': 0.17, 'evaluating': 0.16, 'creating': 0.16}
        
        selected_questions = select_questions_by_distribution(all_questions, num_questions, difficulty_pct, rbt_pct, question_type)
        selected_questions = enforce_marks_distribution(selected_questions, num_questions, (1, 5, 10))
        
        if previous_questions:
            filtered = [q for q in selected_questions if not lstm_model.is_duplicate(q, previous_questions)]
            if len(filtered) < num_questions:
                filtered.extend([q for q in selected_questions if q not in filtered])
            selected_questions = filtered[:num_questions]
        
        session['selected_questions'] = selected_questions
        return redirect(url_for('step6_results'))
    return render_template('generate.html')

@app.route('/step5', methods=['GET', 'POST'])
def step5_custom():
    if 'num_questions' not in session:
        return redirect(url_for('step2_configure'))
    if request.method == 'POST':
        difficulty_pct = {'easy': float(request.form.get('easy_pct', 33))/100, 'medium': float(request.form.get('medium_pct', 34))/100, 'hard': float(request.form.get('hard_pct', 33))/100}
        rbt_pct = {'remembering': float(request.form.get('remembering_pct', 17))/100, 'understanding': float(request.form.get('understanding_pct', 17))/100, 'applying': float(request.form.get('applying_pct', 17))/100, 'analyzing': float(request.form.get('analyzing_pct', 17))/100, 'evaluating': float(request.form.get('evaluating_pct', 16))/100, 'creating': float(request.form.get('creating_pct', 16))/100}
        session['difficulty_pct'] = difficulty_pct
        session['rbt_pct'] = rbt_pct
        
        all_questions = session.get('all_questions', [])
        num_questions = session.get('num_questions', 10)
        question_type = session.get('question_type', 'both')
        selected_questions = select_questions_by_distribution(all_questions, num_questions, difficulty_pct, rbt_pct, question_type)
        selected_questions = enforce_marks_distribution(selected_questions, num_questions, (1, 5, 10))
        session['selected_questions'] = selected_questions
        return redirect(url_for('step6_results'))
    return render_template('custom.html', questions_count=len(session.get('all_questions', [])), num_questions=session.get('num_questions', 10))

@app.route('/step6', methods=['GET', 'POST'])
def step6_results():
    if 'selected_questions' not in session:
        return redirect(url_for('index'))
    selected_questions = session.get('selected_questions', [])
    header_info = session.get('header_info', {})
    if request.method == 'POST':
        questions_data = request.form.get('questions_json')
        if questions_data:
            selected_questions = json.loads(questions_data)
            session['selected_questions'] = selected_questions
        if 'download' in request.form:
            return download_csv(selected_questions, header_info)
    return render_template('results.html', questions=selected_questions, header_info=header_info)

@app.route('/download_csv', methods=['POST'])
def download_csv_route():
    data = request.get_json()
    questions = data.get('questions', [])
    header_info = data.get('header_info', {})
    output = io.StringIO()
    output.write(f"# College: {header_info.get('college_name', '')}\n")
    output.write(f"# Course: {header_info.get('course_name', '')} ({header_info.get('course_code', '')})\n\n")
    fieldnames = ['S.No', 'Question', 'Marks', 'RBT Level', 'Difficulty', 'CO', 'Topic', 'Unit', 'Type']
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for i, q in enumerate(questions, 1):
        writer.writerow({'S.No': i, 'Question': q.get('question', ''), 'Marks': q.get('marks', ''), 'RBT Level': q.get('rbt_level', ''), 'Difficulty': q.get('difficulty', ''), 'CO': q.get('co', ''), 'Topic': q.get('topic', ''), 'Unit': q.get('unit', ''), 'Type': q.get('question_type', 'Theory')})
    output.seek(0)
    response = make_response(output.getvalue())
    response.headers['Content-Disposition'] = 'attachment; filename=question_paper.csv'
    response.headers['Content-type'] = 'text/csv'
    return response

@app.route('/download_pdf', methods=['POST'])
def download_pdf():
    try:
        data = request.get_json()
        questions = data.get('questions', [])
        header_info = data.get('header_info', {})
        
        if not questions:
            return jsonify({'error': 'No questions'}), 400
        
        college = str(header_info.get('college_name', 'College Name'))
        course = str(header_info.get('course_name', 'Course Name'))
        code = str(header_info.get('course_code', 'Code'))

        def safe_pdf_text(value):
            # ReportLab built-in fonts are Latin-1; replace unsupported chars safely.
            return str(value).encode('latin-1', 'replace').decode('latin-1')

        # First choice: ReportLab (pure Python, reliable on Windows)
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.utils import simpleSplit
            from reportlab.pdfgen import canvas

            buffer = io.BytesIO()
            c = canvas.Canvas(buffer, pagesize=A4)
            width, height = A4
            left = 50
            right = width - 50
            y = height - 50

            def ensure_space(lines_needed=1):
                nonlocal y
                if y - (lines_needed * 16) < 50:
                    c.showPage()
                    y = height - 50

            c.setFont("Helvetica-Bold", 16)
            c.drawCentredString(width / 2, y, safe_pdf_text(college))
            y -= 24
            c.setFont("Helvetica-Bold", 14)
            c.drawCentredString(width / 2, y, "Question Paper")
            y -= 20
            c.setFont("Helvetica", 10)
            c.drawString(left, y, safe_pdf_text(f"Course: {course}"))
            c.drawRightString(right, y, safe_pdf_text(f"Code: {code}"))
            y -= 20
            c.line(left, y, right, y)
            y -= 18

            for i, q in enumerate(questions, 1):
                q_text = safe_pdf_text(str(q.get('question', '')).strip())
                marks = safe_pdf_text(q.get('marks', 5))
                co = safe_pdf_text(q.get('co', 'CO1'))
                rbt = safe_pdf_text(q.get('rbt_level', 'Understanding'))
                diff = safe_pdf_text(q.get('difficulty', 'Medium'))
                unit = safe_pdf_text(q.get('unit', 1))

                wrapped = simpleSplit(q_text, "Helvetica", 11, right - left)
                ensure_space(2 + len(wrapped))

                c.setFont("Helvetica-Bold", 11)
                c.drawString(left, y, f"{i}. [{marks} Marks]")
                y -= 15

                c.setFont("Helvetica", 11)
                for line in wrapped:
                    c.drawString(left, y, line)
                    y -= 14

                c.setFont("Helvetica-Oblique", 9)
                c.drawString(left, y, f"{co} | {rbt} | {diff} | Unit {unit}")
                y -= 18

            c.save()
            pdf_bytes = buffer.getvalue()
            buffer.close()

            response = make_response(pdf_bytes)
            response.headers['Content-Disposition'] = 'attachment; filename=question_paper.pdf'
            response.headers['Content-Type'] = 'application/pdf'
            return response
        except Exception as reportlab_error:
            print(f"ReportLab PDF error: {reportlab_error}")

        # Fallback: WeasyPrint (if available)
        html = """<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Question Paper</title>
<style>
body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;}
.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #333;padding-bottom:20px;}
.college{font-size:22px;font-weight:bold;margin-bottom:8px;}
.exam{font-size:18px;margin-bottom:10px;}
.course{font-size:13px;color:#555;}
.question{margin-bottom:18px;padding:10px;border:1px solid #eee;border-radius:5px;}
.q-num{font-weight:bold;font-size:14px;}
.q-marks{color:#666;font-size:13px;margin-left:5px;}
.q-text{margin:8px 0;line-height:1.5;}
.q-meta{font-size:11px;color:#888;margin-top:5px;}
.co{background:#e8e8e8;padding:2px 6px;border-radius:3px;font-size:11px;}
</style>
</head><body>
<div class="header">
<div class="college">""" + escape(college) + """</div>
<div class="exam">Question Paper</div>
<div class="course"><strong>Course:</strong> """ + escape(course) + """ | <strong>Code:</strong> """ + escape(code) + """</div>
</div>
"""
        
        for i, q in enumerate(questions, 1):
            q_text = escape(str(q.get('question', '')))
            marks = escape(str(q.get('marks', 5)))
            co = escape(str(q.get('co', 'CO1')))
            rbt = escape(str(q.get('rbt_level', 'Understanding')))
            diff = escape(str(q.get('difficulty', 'Medium')))
            unit = q.get('unit', 1)
            html += f"""<div class="question">
<div class="q-num">{i}. <span class="q-marks">[ {marks} Marks ]</span></div>
<div class="q-text">{q_text}</div>
<div class="q-meta"><span class="co">{co}</span> | {rbt} | {diff} | Unit {unit}</div>
</div>"""
        
        html += """</body></html>"""
        
        try:
            from weasyprint import HTML
            pdf_bytes = HTML(string=html).write_pdf()
            response = make_response(pdf_bytes)
            response.headers['Content-Disposition'] = 'attachment; filename=question_paper.pdf'
            response.headers['Content-Type'] = 'application/pdf'
            return response
        except Exception as e:
            print(f"WeasyPrint PDF error: {e}")
            return jsonify({'error': 'PDF generation failed. Install reportlab or weasyprint dependencies.'}), 500
    except Exception as e:
        print(f"Download error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
