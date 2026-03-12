import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { GraduationCap, LogOut, BookOpen, ChevronRight, Menu, X, Home, FileText, Download, Edit, Copy, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { subscribeToRecentActivities, updateActivityStatus, cloneQuestionPaper } from '../utils/firestore';
import { collection, query, where, orderBy, limit, doc, updateDoc } from 'firebase/firestore';

const HomePage = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [recentPapers, setRecentPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [validating, setValidating] = useState(null);
  const [cloning, setCloning] = useState(null);
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Use onSnapshot for real-time updates
        const unsub = subscribeToRecentActivities(
          user.uid,
          (papers) => {
            setRecentPapers(papers);
            setLoading(false);
          },
          5 // Limit to 5 recent papers
        );
        return () => unsub();
      } else {
        setRecentPapers([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const menuItems = [
    {
      id: 'question-bank',
      title: 'Question Bank Generation',
      description: 'Create comprehensive question banks',
      icon: BookOpen,
      color: 'primary',
      gradient: 'from-primary-500 to-primary-600'
    }
  ];

  const handleNavigation = (id) => {
    if (id === 'question-bank') navigate('/question-bank');
  };

  // Handle Download PDF
  const handleDownload = async (paper) => {
    console.log('Download PDF:', paper);
    // TODO: Integrate with PDF generator library
    // Pass paper.questions to generate PDF
    alert(`Downloading PDF for: ${paper.title || paper.subject}`);
  };

  // Handle Edit
  const handleEdit = (paper) => {
    console.log('Edit:', paper);
    // Navigate to edit page or open edit modal
    navigate('/question-bank', { state: { editPaper: paper } });
  };

  // Handle Validate (Update status to Validated)
  const handleValidate = async (paperId) => {
    setValidating(paperId);
    try {
      const success = await updateActivityStatus(paperId, "Validated");
      if (success) {
        console.log('Paper validated successfully');
      }
    } catch (error) {
      console.error('Error validating paper:', error);
    } finally {
      setValidating(null);
    }
  };

  // Handle Clone (Generate Set B)
  const handleClone = async (paper) => {
    setCloning(paper.id);
    try {
      // This would call the Groq API to generate new questions
      // excluding the ones from the original paper
      const generateNewQuestions = async (config) => {
        console.log('Generating new questions with config:', config);
        // TODO: Integrate with Groq API
        // Include config.existingQuestions in prompt to avoid repetition
        return [
          { question: "New question 1 for Set B", marks: 10, blooms: "Apply" },
          { question: "New question 2 for Set B", marks: 10, blooms: "Understand" },
        ];
      };

      const newPaperId = await cloneQuestionPaper(
        currentUser.uid,
        paper,
        generateNewQuestions
      );
      
      if (newPaperId) {
        console.log('Set B created successfully:', newPaperId);
        alert('Set B created successfully!');
      }
    } catch (error) {
      console.error('Error cloning paper:', error);
    } finally {
      setCloning(null);
    }
  };

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-slate-100 flex">
      {/* Sidebar */}
      <aside 
        className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-white border-r border-slate-200 shadow-lg flex flex-col transition-all duration-300 fixed lg:relative h-screen z-50`}
      >
        {/* Logo & Toggle */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              {sidebarOpen && (
                <div className="overflow-hidden">
                  <h1 className="text-sm font-bold text-slate-900 whitespace-nowrap">Faculty Assessment</h1>
                  <p className="text-xs text-slate-500">System</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          {/* Dashboard */}
          <div 
            className={`flex items-center gap-3 px-3 py-3 rounded-xl bg-primary-50 text-primary-700 cursor-pointer transition-all ${!sidebarOpen && 'justify-center'}`}
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-semibold">Dashboard</span>}
          </div>

          {menuItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer transition-all group ${!sidebarOpen && 'justify-center'}`}
            >
              <div className={`w-10 h-10 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              {sidebarOpen && (
                <div className="overflow-hidden">
                  <p className="font-medium text-sm truncate group-hover:text-primary-600 transition-colors">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{item.description}</p>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User & Sign Out */}
        <div className="p-3 border-t border-slate-200">
          <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} gap-2`}>
            {sidebarOpen && (
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-slate-600">
                    {currentUser?.email?.charAt(0).toUpperCase() || 'P'}
                  </span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-slate-900 truncate">Professor</p>
                  <p className="text-xs text-slate-500 truncate">
                    {currentUser?.email || 'Faculty Member'}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all flex-shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-0' : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 shadow-sm sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Welcome, Professor!</h2>
              <p className="text-slate-500 text-sm">Choose an option from the sidebar to get started</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">Academic Year 2025-26</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">
          {/* Welcome Card */}
          <div className="bg-gradient-to-r from-primary-500 to-indigo-600 rounded-2xl p-8 mb-8 text-white">
            <h3 className="text-2xl font-bold mb-2">Faculty Assessment System</h3>
            <p className="text-primary-100">Manage your question banks with ease. Use the sidebar navigation to access the Question Bank Generation feature.</p>
          </div>

          {/* Feature Cards */}
          <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Access</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mb-8">
            {menuItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 cursor-pointer transition-all group p-6"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center mb-4 shadow-md`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-slate-900 mb-1 group-hover:text-primary-600 transition-colors">
                  {item.title}
                </h4>
                <p className="text-slate-500 text-sm mb-4">{item.description}</p>
                <div className="flex items-center text-primary-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                  Access <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>

          {/* Recent Question Paper Activity */}
          <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Question Paper Activity</h3>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-600 spinner" />
                <span className="ml-2 text-slate-500">Loading activities...</span>
              </div>
            )}

            {/* Empty State */}
            {!loading && recentPapers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <FileText className="w-12 h-12 text-slate-300 mb-3" />
                <p className="font-medium">No recent activities</p>
                <p className="text-sm">Generate your first question paper to see it here</p>
              </div>
            )}

            {/* Table Header */}
            {!loading && recentPapers.length > 0 && (
              <>
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 grid grid-cols-12 gap-4 text-sm font-semibold text-slate-600">
                  <div className="col-span-4">Question Paper</div>
                  <div className="col-span-2">Course Code</div>
                  <div className="col-span-2">Semester</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                {/* Table Body */}
                {recentPapers.map((paper) => (
                  <div key={paper.id} className="px-6 py-4 grid grid-cols-12 gap-4 items-center border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    {/* Paper Info */}
                    <div className="col-span-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{paper.title || paper.subject}</p>
                          <p className="text-xs text-slate-500">{formatDate(paper.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Course Code */}
                    <div className="col-span-2">
                      <span className="text-sm text-slate-600">{paper.courseCode || 'N/A'}</span>
                    </div>

                    {/* Semester */}
                    <div className="col-span-2">
                      <span className="text-sm text-slate-600">Semester {paper.semester || 'N/A'}</span>
                    </div>

                    {/* Status Badge */}
                    <div className="col-span-2">
                      {paper.status === 'Validated' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Validated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          <Clock className="w-3.5 h-3.5" />
                          Draft
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleDownload(paper)}
                        className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(paper)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {paper.status === 'Draft' && (
                        <button 
                          onClick={() => handleValidate(paper.id)}
                          disabled={validating === paper.id}
                          className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all disabled:opacity-50"
                          title="Validate"
                        >
                          {validating === paper.id ? (
                            <Loader2 className="w-4 h-4 spinner" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button 
                        onClick={() => handleClone(paper)}
                        disabled={cloning === paper.id}
                        className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all disabled:opacity-50"
                        title="Clone (Generate Set B)"
                      >
                        {cloning === paper.id ? (
                          <Loader2 className="w-4 h-4 spinner" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}

                {/* View All Link */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                  <button className="text-sm text-primary-600 font-medium hover:text-primary-700 transition-colors flex items-center gap-1">
                    View all question papers <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
