import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { GraduationCap, Loader2, LogOut, BookOpen, Users, FileText, ChevronDown } from 'lucide-react';
import FacultyPortal from './components/FacultyPortal';
import HomePage from './components/HomePage';
import QuestionPaperGeneration from './components/QuestionPaperGeneration';
import AIPaperGenerator from './components/AIPaperGenerator';

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Loading Spinner Component
const LoadingSpinner = ({ size = 'md', text = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  return (
    <div className="flex flex-col items-center justify-center">
      <Loader2 className={`${sizeClasses[size]} spinner text-primary-600`} />
      {text && <p className="text-slate-500 mt-2 text-sm">{text}</p>}
    </div>
  );
};

// Auth Provider Component - Handles Real-Time Authentication
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time authentication observer
    // This triggers immediately on login, logout, or session refresh
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch additional user data from Firestore
          const userDoc = await getDoc(doc(db, 'faculty', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ ...firebaseUser, ...userDoc.data() });
          } else {
            setUser(firebaseUser);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  // Loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Checking session..." />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={user}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component - Secures routes
const ProtectedRoute = ({ children }) => {
  const user = useAuth();
  const loading = user === null;
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Authenticating..." />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Auth Page Component
const AuthPage = () => {
  return <FacultyPortal />;
};

// Question Bank Generation Component (Selection Dashboard)
const SelectionDashboard = () => {
  const [branches, setBranches] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const branchData = [
          { id: 'CSE', name: 'Computer Science & Engineering' },
          { id: 'CS-AI', name: 'Computer Science (Artificial Intelligence & Machine Learning)' },
          { id: 'CS-DS', name: 'Computer Science (Data Science)' },
          { id: 'AI-ML', name: 'AI & Machine Learning' },
          { id: 'ECE', name: 'Electronics & Communication Engineering' },
          { id: 'ME', name: 'Mechanical Engineering' },
          { id: 'EE', name: 'Electrical Engineering' }
        ];
        setBranches(branchData);
      } catch (error) {
        console.error('Error fetching branches:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      setSemesters([1, 2, 3, 4, 5, 6, 7, 8]);
      setSelectedSemester('');
      setSelectedSubject('');
      setSubjects([]);
    } else {
      setSemesters([]);
      setSelectedSemester('');
      setSelectedSubject('');
      setSubjects([]);
    }
  }, [selectedBranch]);

  useEffect(() => {
    if (selectedBranch && selectedSemester) {
      const subjectData = {
        'CSE': {
          1: ['Mathematics-I', 'Physics', 'Chemistry', 'Programming Fundamentals'],
          2: ['Mathematics-II', 'Data Structures', 'Digital Logic', 'Computer Architecture'],
          3: ['Algorithms', 'Operating Systems', 'Database Systems', 'Computer Networks'],
          4: ['Machine Learning', 'Software Engineering', 'Web Development', 'Microprocessors'],
          5: ['Deep Learning', 'Natural Language Processing', 'Cloud Computing', 'Mobile Development'],
          6: ['Reinforcement Learning', 'Computer Vision', 'Cybersecurity', 'Distributed Systems'],
          7: ['Advanced ML', 'Blockchain', 'Quantum Computing', 'Research Methodology'],
          8: ['Capstone Project', 'Industry Internship', 'Seminar', 'Thesis']
        },
        'AI-ML': {
          1: ['Mathematics-I', 'Physics', 'Chemistry', 'Programming Fundamentals'],
          2: ['Mathematics-II', 'Data Structures', 'Digital Logic', 'Python Programming'],
          3: ['Algorithms', 'Operating Systems', 'Database Systems', 'Computer Networks'],
          4: ['Machine Learning', 'Statistical Methods', 'Data Visualization', 'Web Development'],
          5: ['Deep Learning', 'Natural Language Processing', 'Cloud Computing', 'Computer Vision'],
          6: ['Reinforcement Learning', 'Natural Language Processing', 'Deep Learning', 'Business Data Analytics'],
          7: ['Reinforcement Learning', 'Natural Language Processing', 'Deep Learning', 'Business Data Analytics'],
          8: ['Capstone Project', 'Industry Internship', 'Seminar', 'Thesis']
        },
        'CS-AI': {
          1: ['Mathematics-I', 'Physics', 'Chemistry', 'Programming Fundamentals'],
          2: ['Mathematics-II', 'Data Structures', 'Digital Logic', 'Python Programming'],
          3: ['Algorithms', 'Operating Systems', 'Database Systems', 'Computer Networks'],
          4: ['Machine Learning', 'Statistical Methods', 'Data Visualization', 'Web Development'],
          5: ['Deep Learning', 'Natural Language Processing', 'Cloud Computing', 'Computer Vision'],
          6: ['Deep Learning', 'Natural Language Processing', 'Business Data Analytics', 'Reinforcement Learning'],
          7: ['Advanced ML', 'Generative AI', 'AI Ethics', 'Research Methodology'],
          8: ['Capstone Project', 'Industry Internship', 'Seminar', 'Thesis']
        },
        'CS-DS': {
          1: ['Mathematics-I', 'Physics', 'Chemistry', 'Programming Fundamentals'],
          2: ['Mathematics-II', 'Data Structures', 'Statistics', 'Python Programming'],
          3: ['Algorithms', 'Database Systems', 'Probability Theory', 'Data Mining'],
          4: ['Machine Learning', 'Statistical Methods', 'Data Visualization', 'Big Data'],
          5: ['Deep Learning', 'Natural Language Processing', 'Cloud Computing', 'Time Series Analysis'],
          6: ['Reinforcement Learning', 'Computer Vision', 'Business Analytics', 'Data Engineering'],
          7: ['Advanced Analytics', 'Blockchain', 'Research Methodology', 'Predictive Modeling'],
          8: ['Capstone Project', 'Industry Internship', 'Seminar', 'Thesis']
        },
        'ECE': {
          1: ['Mathematics-I', 'Physics', 'Chemistry', 'Basic Electrical'],
          2: ['Mathematics-II', 'Electronic Devices', 'Circuit Theory', 'Signals Systems'],
          3: ['Digital Electronics', 'Microcontrollers', 'Electromagnetic Fields', 'Network Analysis'],
          4: ['Communication Systems', 'Control Systems', 'VLSI Design', 'Signal Processing'],
          5: ['Wireless Communication', 'Antenna Design', 'Embedded Systems', 'Digital Signal Processing'],
          6: ['Optical Communication', 'RF Engineering', 'IoT', 'Machine Learning for ECE'],
          7: ['5G Networks', 'VLSI Testing', 'Advanced Signal Processing', 'Research Methodology'],
          8: ['Capstone Project', 'Industry Internship', 'Seminar', 'Thesis']
        },
        'ME': {
          1: ['Mathematics-I', 'Physics', 'Chemistry', 'Engineering Graphics'],
          2: ['Mathematics-II', 'Thermodynamics', 'Material Science', 'Manufacturing Processes'],
          3: ['Fluid Mechanics', 'Strength of Materials', 'Kinematics', 'Machine Drawing'],
          4: ['Dynamics of Machinery', 'Heat Transfer', 'CAD/CAM', 'Control Engineering'],
          5: ['Design of Machine Elements', 'Refrigeration & AC', 'Finite Element Analysis', 'Automobile Engineering'],
          6: ['Industrial Engineering', 'Robotics', 'Computational Fluid Dynamics', 'Product Design'],
          7: ['Additive Manufacturing', 'Sustainable Manufacturing', 'Research Methodology', 'Energy Engineering'],
          8: ['Capstone Project', 'Industry Internship', 'Seminar', 'Thesis']
        },
        'EE': {
          1: ['Mathematics-I', 'Physics', 'Chemistry', 'Basic Electrical'],
          2: ['Mathematics-II', 'Circuit Analysis', 'Electronic Devices', 'Electromagnetic Fields'],
          3: ['Power Systems-I', 'Electrical Machines-I', 'Control Systems', 'Power Electronics'],
          4: ['Power Systems-II', 'Electrical Machines-II', 'Digital Signal Processing', 'Microprocessors'],
          5: ['Power System Analysis', 'Switchgear & Protection', 'Renewable Energy', 'High Voltage Engineering'],
          6: ['Smart Grid', 'Electric Drives', 'Power Quality', 'Embedded Systems'],
          7: ['Advanced Power Electronics', 'Research Methodology', 'Energy Audit', 'Smart Buildings'],
          8: ['Capstone Project', 'Industry Internship', 'Seminar', 'Thesis']
        }
      };
      
      setSubjects(subjectData[selectedBranch]?.[selectedSemester] || []);
    } else {
      setSubjects([]);
      setSelectedSubject('');
    }
  }, [selectedBranch, selectedSemester]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleProceed = async () => {
    if (!selectedBranch || !selectedSemester || !selectedSubject) return;
    
    setIsSubmitting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Proceeding with:', {
        branch: selectedBranch,
        semester: selectedSemester,
        subject: selectedSubject
      });
      alert(`Proceeding to generate question bank for:\nBranch: ${selectedBranch}\nSemester: ${selectedSemester}\nSubject: ${selectedSubject}`);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isProceedDisabled = !selectedBranch || !selectedSemester || !selectedSubject || isSubmitting;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Question Bank Generation</h1>
              <p className="text-xs text-slate-500">Faculty Assessment System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/home')}
              className="text-sm text-slate-600 hover:text-primary-600 transition-colors"
            >
              ← Back to Home
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-6">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-white" />
              <h2 className="text-xl font-bold text-white">Course Selection</h2>
            </div>
            <p className="text-primary-100 mt-1">Select your branch, semester, and subject to generate question bank</p>
          </div>

          {/* Card Body */}
          <div className="p-8">
            <div className="grid gap-6">
              {/* Branch Dropdown */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <Users className="w-4 h-4 text-primary-600" />
                  Branch
                </label>
                <div className="relative">
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} ({branch.id})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Semester Dropdown */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <FileText className="w-4 h-4 text-primary-600" />
                  Semester
                </label>
                <div className="relative">
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    disabled={!selectedBranch}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {selectedBranch ? 'Select Semester' : 'Select Branch First'}
                    </option>
                    {semesters.map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Subject Dropdown */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <BookOpen className="w-4 h-4 text-primary-600" />
                  Subject
                </label>
                <div className="relative">
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    disabled={!selectedSemester}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {selectedSemester ? 'Select Subject' : 'Select Semester First'}
                    </option>
                    {subjects.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Proceed Button */}
            <div className="mt-8">
              <button
                onClick={handleProceed}
                disabled={isProceedDisabled}
                className="w-full py-4 px-6 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-600/25"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    <span>Proceed to Generate Question Bank</span>
                  </>
                )}
              </button>
              <p className="text-center text-slate-500 text-sm mt-3">
                {!selectedBranch || !selectedSemester || !selectedSubject
                  ? 'Please select all fields to proceed'
                  : 'Ready to generate question bank'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Main App Component with Real-Time Authentication
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Route - Redirects to home if already authenticated */}
          <Route path="/" element={<AuthPageWrapper />} />
          
          {/* Protected Routes */}
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/question-bank" 
            element={
              <ProtectedRoute>
                <SelectionDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/question-paper" 
            element={
              <ProtectedRoute>
                <QuestionPaperGeneration />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ai-paper-generator" 
            element={
              <ProtectedRoute>
                <AIPaperGenerator />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

// Auth Page Wrapper - Handles redirect if already logged in
const AuthPageWrapper = () => {
  const user = useAuth();
  
  if (user) {
    return <Navigate to="/home" replace />;
  }
  
  return <AuthPage />;
};

export default App;
