import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, ArrowLeft, Upload, FileText, Settings, Layers, Download, Printer, Brain, Sparkles } from 'lucide-react';

// Groq API configuration
const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const AIPaperGenerator = () => {
  const navigate = useNavigate();
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPaper, setGeneratedPaper] = useState(null);
  const [error, setError] = useState('');
  const [courseInfo, setCourseInfo] = useState({
    subjectName: '',
    courseCode: '',
    semester: '',
    examType: 'Internal Examination',
    duration: '3 Hours',
    maxMarks: '100'
  });

  // Parse CSV file
  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], data: [] };

    const headers = lines[0].split(',').map(h => h.trim());
    const data = lines.slice(1).map(line => {
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    });

    return { headers, data };
  };

  // Handle CSV file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError('');

    try {
      const text = await file.text();
      const { headers, data } = parseCSV(text);
      
      if (headers.length === 0 || data.length === 0) {
        throw new Error('Invalid CSV file format');
      }

      setCsvHeaders(headers);
      setCsvData(data);
    } catch (err) {
      setError('Failed to parse CSV file: ' + err.message);
      setCsvData([]);
      setCsvHeaders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate question paper using Groq API
  const generatePaperWithAI = async () => {
    if (csvData.length === 0) {
      setError('Please upload a CSV file first');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      // Prepare CSV data for the prompt
      const questionsList = csvData.map((row, index) => {
        const question = row[1] || ''; // Question column
        const marks = row[2] || '';    // Marks column
        const rbt = row[3] || '';      // RBT Level
        const difficulty = row[4] || ''; // Difficulty
        const co = row[5] || '';        // Course Outcomes
        const topic = row[6] || '';     // Topic Name
        const unit = row[7] || '';       // Unit Name
        return `Q${index + 1}: ${question} | Marks: ${marks} | RBT: ${rbt} | Difficulty: ${difficulty} | CO: ${co} | Topic: ${topic} | Unit: ${unit}`;
      }).join('\n');

      const prompt = `You are an expert question paper generator for NLP (Natural Language Processing) subject. 

Based on the following question bank from CSV, generate a well-structured question paper.

Course Information:
- Subject: ${courseInfo.subjectName || 'NLP'}
- Course Code: ${courseInfo.courseCode || 'N/A'}
- Semester: ${courseInfo.semester || 'N/A'}
- Exam Type: ${courseInfo.examType}
- Duration: ${courseInfo.duration}
- Max Marks: ${courseInfo.maxMarks}

Question Bank:
${questionsList}

Generate a question paper that:
1. Covers different units/topics from the question bank
2. Includes questions of varying difficulty (Easy, Medium, Hard)
3. Covers different RBT levels (Remember, Understanding, Apply, Analyze, Create)
4. Has proper distribution of marks
5. Maps questions to Course Outcomes (CO)
6. Includes PART-A, PART-B, PART-C sections if needed

Format the output as:
[QUESTION PAPER HEADER]
Subject: [Subject Name]
Course Code: [Code]
Semester: [Semester]
Duration: [Duration]
Max Marks: [Marks]

[PART-A: Short Answer Questions - 2 marks each]
1. [Question] [Marks] [CO] [RBT]
2. [Question] [Marks] [CO] [RBT]
...

[PART-B: Long Answer Questions - 10 marks each]
1. [Question] [Marks] [CO] [RBT]
2. [Question] [Marks] [CO] [RBT]
...

[PART-C: Long Answer Questions - 15 marks each]
1. [Question] [Marks] [CO] [RBT]
2. [Question] [Marks] [CO] [RBT]
...

IMPORTANT: 
- Select questions from the provided question bank only
- Make sure total marks add up to approximately ${courseInfo.maxMarks}
- Cover all major units from the question bank
- Include a mix of difficulty levels`;

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
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
        courseInfo: { ...courseInfo },
        content: generatedText,
        questionCount: csvData.length
      });

    } catch (err) {
      setError('Failed to generate paper: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Print question paper
  const printPaper = () => {
    window.print();
  };

  // Download question paper
  const downloadPaper = () => {
    if (!generatedPaper) return;
    
    const content = `
<!DOCTYPE html>
<html>
<head>
  <title>Question Paper - ${generatedPaper.courseInfo.subjectName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1, h2, h3 { text-align: center; }
    .header { text-align: center; margin-bottom: 30px; }
    .question { margin: 15px 0; }
    .marks { float: right; font-weight: bold; }
    .co-rbt { font-size: 12px; color: #666; }
  </style>
</head>
<body>
  ${generatedPaper.content.replace(/\n/g, '<br>')}
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
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">AI Question Paper Generator</h1>
              <p className="text-xs text-slate-500">Powered by Groq API</p>
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
              onClick={() => navigate('/')}
              className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <style>{`
          .gen-card {
            background: white;
            padding: 25px;
            margin-bottom: 25px;
            border-radius: 12px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          }
          
          .gen-card h2 {
            color: #4f46e5;
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .gen-label {
            display: block;
            margin-bottom: 5px;
            color: #475569;
            font-weight: 500;
          }
          
          .gen-input, .gen-select {
            width: 100%;
            padding: 10px;
            margin-top: 5px;
            margin-bottom: 15px;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
            font-size: 14px;
            box-sizing: border-box;
          }
          
          .gen-input:focus, .gen-select:focus {
            outline: none;
            border-color: #4f46e5;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
          }
          
          .gen-button {
            background: linear-gradient(90deg, #6366f1, #7c3aed);
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 10px;
            font-weight: 600;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          
          .gen-button:hover {
            opacity: 0.9;
            transform: translateY(-1px);
          }
          
          .gen-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
          }
          
          .gen-button.secondary {
            background: linear-gradient(90deg, #10b981, #059669);
          }
          
          .gen-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 13px;
          }
          
          .gen-table th, .gen-table td {
            border: 1px solid #e2e8f0;
            padding: 8px;
            text-align: left;
          }
          
          .gen-table th {
            background: #f1f5f9;
            color: #475569;
            font-weight: 600;
          }
          
          .gen-table tr:nth-child(even) {
            background: #f8fafc;
          }
          
          .error-msg {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          
          .success-msg {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #16a34a;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          
          .paper-content {
            background: #f8fafc;
            padding: 30px;
            border-radius: 12px;
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
            line-height: 1.8;
          }
          
          .loading-spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          .stats-bar {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            flex-wrap: wrap;
          }
          
          .stat-item {
            background: #f1f5f9;
            padding: 10px 20px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .stat-item strong {
            color: #4f46e5;
          }
          
          @media print {
            header, .no-print {
              display: none;
            }
          }
        `}</style>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Input */}
          <div>
            {/* Course Information */}
            <div className="gen-card">
              <h2><FileText className="w-5 h-5" />Course Information</h2>
              <label className="gen-label">Subject / Course Name</label>
              <input 
                type="text" 
                className="gen-input"
                placeholder="e.g., Natural Language Processing"
                value={courseInfo.subjectName}
                onChange={(e) => setCourseInfo({...courseInfo, subjectName: e.target.value})}
              />

              <label className="gen-label">Course Code</label>
              <input 
                type="text" 
                className="gen-input"
                placeholder="e.g., CS301"
                value={courseInfo.courseCode}
                onChange={(e) => setCourseInfo({...courseInfo, courseCode: e.target.value})}
              />

              <label className="gen-label">Semester</label>
              <select 
                className="gen-select"
                value={courseInfo.semester}
                onChange={(e) => setCourseInfo({...courseInfo, semester: e.target.value})}
              >
                <option value="">Select Semester</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
                <option value="7">Semester 7</option>
                <option value="8">Semester 8</option>
              </select>

              <label className="gen-label">Exam Type</label>
              <select 
                className="gen-select"
                value={courseInfo.examType}
                onChange={(e) => setCourseInfo({...courseInfo, examType: e.target.value})}
              >
                <option value="Internal Examination">Internal Examination</option>
                <option value="External Examination">External Examination</option>
                <option value="Model Examination">Model Examination</option>
                <option value="Quiz">Quiz</option>
              </select>

              <label className="gen-label">Duration</label>
              <select 
                className="gen-select"
                value={courseInfo.duration}
                onChange={(e) => setCourseInfo({...courseInfo, duration: e.target.value})}
              >
                <option value="1 Hour">1 Hour</option>
                <option value="2 Hours">2 Hours</option>
                <option value="3 Hours">3 Hours</option>
              </select>

              <label className="gen-label">Max Marks</label>
              <select 
                className="gen-select"
                value={courseInfo.maxMarks}
                onChange={(e) => setCourseInfo({...courseInfo, maxMarks: e.target.value})}
              >
                <option value="50">50 Marks</option>
                <option value="75">75 Marks</option>
                <option value="100">100 Marks</option>
              </select>
            </div>

            {/* CSV Upload */}
            <div className="gen-card">
              <h2><Upload className="w-5 h-5" />Upload Question Bank (CSV)</h2>
              <label className="gen-label">Select CSV file with question bank</label>
              <input 
                type="file" 
                accept=".csv"
                onChange={handleFileUpload}
                className="gen-input"
                style={{ padding: '8px' }}
              />

              {isLoading && <p>Loading CSV...</p>}

              {csvData.length > 0 && (
                <div className="success-msg">
                  ✓ Loaded {csvData.length} questions from CSV
                </div>
              )}

              {csvData.length > 0 && (
                <>
                  <h3 style={{ marginTop: '20px', color: '#475569' }}>Question Bank Preview</h3>
                  <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                    <table className="gen-table">
                      <thead>
                        <tr>
                          {csvHeaders.map((header, idx) => (
                            <th key={idx}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 10).map((row, rowIdx) => (
                          <tr key={rowIdx}>
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvData.length > 10 && (
                    <p style={{ color: '#666', fontSize: '12px', marginTop: '10px' }}>
                      Showing first 10 of {csvData.length} questions
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Generate Button */}
            <div className="gen-card">
              <h2><Sparkles className="w-5 h-5" />Generate Question Paper</h2>
              
              {error && <div className="error-msg">{error}</div>}
              
              <button 
                className="gen-button"
                onClick={generatePaperWithAI}
                disabled={isGenerating || csvData.length === 0}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isGenerating ? (
                  <>
                    <span className="loading-spinner"></span>
                    Generating with AI...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    Generate Question Paper
                  </>
                )}
              </button>
              
              <p style={{ color: '#666', fontSize: '12px', marginTop: '10px' }}>
                Uses Groq LLM to intelligently select and organize questions from your CSV
              </p>
            </div>
          </div>

          {/* Right Column - Output */}
          <div>
            {generatedPaper && (
              <div className="gen-card">
                <h2>Generated Question Paper</h2>
                
                <div className="stats-bar">
                  <div className="stat-item">
                    <FileText className="w-4 h-4" />
                    <span>Questions: <strong>{generatedPaper.questionCount}</strong></span>
                  </div>
                  <div className="stat-item">
                    <span>Marks: <strong>{generatedPaper.courseInfo.maxMarks}</strong></span>
                  </div>
                </div>

                <div className="paper-content">
                  {generatedPaper.content}
                </div>

                <div className="no-print" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button className="gen-button secondary" onClick={printPaper}>
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button className="gen-button" onClick={downloadPaper}>
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            )}

            {!generatedPaper && (
              <div className="gen-card" style={{ textAlign: 'center', padding: '60px 25px' }}>
                <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 style={{ color: '#475569', marginBottom: '10px' }}>No Question Paper Generated Yet</h3>
                <p style={{ color: '#64748b' }}>
                  Upload your question bank CSV and click Generate to create a question paper using AI
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AIPaperGenerator;
