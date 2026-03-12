import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, ArrowLeft, Upload, FileText, Download, Printer, Sparkles } from 'lucide-react';

const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const QuestionPaperGeneration = () => {
  const navigate = useNavigate();
  const [csvData, setCsvData] = useState([]);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [generatedPaper, setGeneratedPaper] = useState(null);
  const [aiError, setAiError] = useState('');

  const handleSignOut = () => {
    navigate('/');
  };

  const handleFileUpload = (event) => {
    const files = event.target.files;
    const fileList = document.getElementById('fileList');
    if (fileList) fileList.innerHTML = '';

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        displayCSV(text);
      };
      reader.readAsText(file);
    });
  };

  const displayCSV = (data) => {
    const table = document.getElementById('csvPreview');
    if (!table) return;
    
    table.innerHTML = '';
    const rows = data.split('\n').filter(row => row.trim());
    
    rows.forEach((row) => {
      const cols = row.split(',');
      const tr = document.createElement('tr');
      cols.forEach((col) => {
        const td = document.createElement('td');
        td.textContent = col.trim();
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    const csvRows = rows.map(row => row.split(',').map(col => col.trim()));
    setCsvData(csvRows);
  };

  const generatePaperWithAI = async () => {
    if (csvData.length === 0) {
      setAiError('Please upload a CSV file first');
      return;
    }

    setIsAIGenerating(true);
    setAiError('');

    try {
      const subjectName = document.getElementById('subjectName')?.value || 'Unknown Subject';
      const courseCode = document.getElementById('courseCode')?.value || 'N/A';
      const semester = document.getElementById('semester')?.value || 'N/A';
      const module = document.getElementById('module')?.value || 'N/A';

      const questionsList = csvData.map((row, index) => {
        const question = row[1] || '';
        const marks = row[2] || '';
        const rbt = row[3] || '';
        const difficulty = row[4] || '';
        const co = row[5] || '';
        const topic = row[6] || '';
        const unit = row[7] || '';
        return `Q${index + 1}: ${question} | Marks: ${marks} | RBT: ${rbt} | Difficulty: ${difficulty} | CO: ${co} | Topic: ${topic} | Unit: ${unit}`;
      }).join('\n');

      const prompt = `You are an expert question paper generator. Based on the following question bank from CSV, generate a well-structured question paper with EQUAL DISTRIBUTION.

Course Information:
- Subject: ${subjectName}
- Course Code: ${courseCode}
- Semester: ${semester}
- Module: ${module}

Question Bank:
${questionsList}

IMPORTANT - STRICT DISTRIBUTION REQUIREMENTS:
1. RBT LEVELS (Bloom's Taxonomy) - MUST BE EQUAL:
   - Remember: 16.67%
   - Understand: 16.67%
   - Apply: 16.67%
   - Analyze: 16.67%
   - Evaluate: 16.67%
   - Create: 16.67%

2. DIFFICULTY LEVELS - MUST BE EQUAL:
   - Easy: 33.33%
   - Medium: 33.33%
   - Hard: 33.33%

3. COURSE OUTCOMES (CO) - MUST BE EQUAL:
   - Distribute questions equally across all COs present in the question bank

4. MARKS DISTRIBUTION:
   - Total marks should equal 100
   - PART-A (2 marks each): Short answer questions
   - PART-B (10 marks each): Long answer questions  
   - PART-C (15 marks each): Essay type questions

Generate a question paper that:
- Has EXACTLY EQUAL distribution of RBT levels (6 levels = equal split)
- Has EXACTLY EQUAL distribution of difficulty (Easy/Medium/Hard = equal split)
- Covers all Course Outcomes equally
- Covers different units/topics
- Has proper marks distribution

Format:
[HEADER]
Subject: [Subject Name]
Course Code: [Code]
Semester: [Semester]
Duration: [Duration]
Max Marks: [Marks]

[PART-A: Short Answer - 2 marks each]
1. [Question] [2 marks] [CO] [RBT: Remember/Understand] [Easy/Medium]
...

[PART-B: Long Answer - 10 marks each]
1. [Question] [10 marks] [CO] [RBT: Apply/Analyze] [Medium/Hard]
...

[PART-C: Essay - 15 marks each]
1. [Question] [15 marks] [CO] [RBT: Evaluate/Create] [Hard]
...

Show a summary table at the end showing the distribution is equal.`;

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate question paper');
      }

      const data = await response.json();
      const generatedText = data.choices[0]?.message?.content;

      if (!generatedText) {
        throw new Error('No response from AI');
      }

      setGeneratedPaper({
        subjectName,
        courseCode,
        semester,
        module,
        aiContent: generatedText
      });

    } catch (err) {
      setAiError('Failed to generate paper: ' + err.message);
    } finally {
      setIsAIGenerating(false);
    }
  };

  const printPaper = () => {
    window.print();
  };

  const downloadPaper = () => {
    if (!generatedPaper) return;
    
    const content = `<!DOCTYPE html>
<html>
<head>
  <title>Question Paper - ${generatedPaper.subjectName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Open Sans', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1e293b; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4f46e5; padding-bottom: 20px; }
    .header h1 { font-family: 'Merriweather', serif; color: #4f46e5; margin: 0; font-size: 24px; }
    .header p { margin: 5px 0; color: #64748b; }
    .content { white-space: pre-wrap; font-family: 'Open Sans', sans-serif; line-height: 1.8; }
    @media print { header, .action-buttons { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${generatedPaper.subjectName}</h1>
    <p>Course Code: ${generatedPaper.courseCode} | Semester: ${generatedPaper.semester} | Module: ${generatedPaper.module}</p>
  </div>
  <div class="content">${generatedPaper.aiContent ? generatedPaper.aiContent : ''}</div>
</body>
</html>`;
    
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `question_paper_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Question Paper Generator</h1>
              <p className="text-xs text-slate-500">Faculty Assessment System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/home')}
              className="text-sm text-slate-600 hover:text-primary-600 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
            <button
              onClick={handleSignOut}
              className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <style>{`
          body { font-family: 'Open Sans', Arial, sans-serif; background: linear-gradient(135deg, #eef2ff, #f8fafc); margin: 0; }
          .container { width: 100%; padding: 20px; }
          h1 { text-align: center; margin-bottom: 30px; color: #1e293b; font-family: 'Merriweather', serif; }
          .card { background: white; padding: 25px; margin-bottom: 25px; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
          .card h2 { color: #4f46e5; margin-top: 0; margin-bottom: 15px; font-size: 1.2rem; }
          label { display: block; margin-bottom: 5px; color: #475569; font-weight: 500; }
          input, select { width: 100%; padding: 10px; margin-top: 5px; margin-bottom: 15px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 14px; box-sizing: border-box; }
          input:focus, select:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
          button { background: linear-gradient(90deg, #f59e0b, #d97706); color: white; padding: 14px 24px; border: none; border-radius: 8px; cursor: pointer; margin-top: 10px; font-weight: 600; transition: opacity 0.2s; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; }
          button:hover { opacity: 0.9; }
          button:disabled { opacity: 0.5; cursor: not-allowed; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: center; }
          th { background: #f1f5f9; color: #475569; font-weight: 600; }
          .file-list { list-style: none; padding: 0; }
          .file-list li { padding: 8px 12px; background: #f1f5f9; margin-bottom: 5px; border-radius: 6px; display: flex; align-items: center; gap: 8px; }
          .paper-output { padding: 20px; background: #f8fafc; border-radius: 8px; }
          .paper-output h3 { color: #4f46e5; margin-top: 0; font-family: 'Merriweather', serif; }
          .paper-header { text-align: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
          .action-buttons { display: flex; gap: 10px; margin-top: 15px; }
          .action-buttons button { flex: 1; }
          .ai-content { white-space: pre-wrap; font-family: 'Open Sans', sans-serif; line-height: 1.8; padding: 20px; background: white; border-radius: 8px; }
          .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: white; animation: spin 1s ease-in-out infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @media print { header, .action-buttons { display: none; } }
        `}</style>

        <div className="container">
          <h1>Question Paper Generator</h1>

          <div className="card">
            <h2><FileText className="w-5 h-5 inline mr-2" />Course Information</h2>
            <label>Course / Subject Name</label>
            <input type="text" id="subjectName" placeholder="Enter subject name" />

            <label>Course Code</label>
            <input type="text" id="courseCode" placeholder="e.g., CS301" />

            <label>Semester</label>
            <select id="semester">
              <option value="">Select Semester</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
            </select>

            <label>Module / Unit</label>
            <input type="text" id="module" placeholder="e.g., Unit 1, Unit 2" />
          </div>

          <div className="card">
            <h2><Upload className="w-5 h-5 inline mr-2" />Reference Question Dataset (CSV)</h2>
            <label>Upload CSV files containing reference questions or question bank</label>
            <input type="file" id="csvUpload" multiple accept=".csv" onChange={handleFileUpload} />

            <ul id="fileList" className="file-list"></ul>

            <h3 style={{ marginTop: '20px', color: '#475569' }}>CSV Preview</h3>
            <table id="csvPreview">
              <tr><th>Preview data will appear here</th></tr>
            </table>
          </div>

          <div className="card">
            <button 
              onClick={generatePaperWithAI} 
              disabled={isAIGenerating || csvData.length === 0}
            >
              {isAIGenerating ? <><span className="spinner"></span> Generating with AI...</> : <><Sparkles className="w-5 h-5" />AI Generate Question Paper</>}
            </button>
            {aiError && (
              <div style={{ color: '#dc2626', marginTop: '10px', padding: '10px', background: '#fef2f2', borderRadius: '6px' }}>
                {aiError}
              </div>
            )}
          </div>

          {generatedPaper && (
            <div className="card">
              <h2>Generated Question Paper</h2>
              <div className="paper-output">
                <div className="paper-header">
                  <h3>{generatedPaper.subjectName}</h3>
                  <p>Course Code: {generatedPaper.courseCode} | Semester: {generatedPaper.semester} | Module: {generatedPaper.module}</p>
                </div>
                <div className="ai-content">
                  {generatedPaper.aiContent}
                </div>
                <div className="action-buttons">
                  <button onClick={printPaper} style={{ background: 'linear-gradient(90deg, #6366f1, #7c3aed)' }}>
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button onClick={downloadPaper} style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }}>
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default QuestionPaperGeneration;
