import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, Upload, Briefcase, Award, GraduationCap, CheckCircle, 
  AlertTriangle, RefreshCw, LogOut, ArrowRight, UserPlus, LogIn,
  Trash2, BookOpen, Download, User, Mail, Phone, ChevronRight, BarChart2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function App() {
  // Authentication State
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
  const [authView, setAuthView] = useState('login'); // login, signup
  const [authError, setAuthError] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // App Navigation & Data State
  const [currentTab, setCurrentTab] = useState('dashboard'); // dashboard, upload, history
  const [resumes, setResumes] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Resume Upload State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState(null);

  // Analysis State
  const [jobDescription, setJobDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState('');

  // Configure Axios default authorization header on load / token update
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      localStorage.setItem('userEmail', userEmail);
      fetchDashboardStats();
      fetchResumes();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      localStorage.removeItem('userEmail');
    }
  }, [token]);

  const handleLogout = () => {
    setToken('');
    setUserEmail('');
    setResumes([]);
    setDashboardStats(null);
    setAnalysisResult(null);
    setCurrentTab('dashboard');
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authView === 'signup' ? '/auth/signup' : '/auth/login';
    
    try {
      if (authView === 'signup') {
        await axios.post(`${API_BASE_URL}${endpoint}`, {
          email: authEmail,
          password: authPassword
        });
        // Auto-login after signup
        const loginRes = await axios.post(
          `${API_BASE_URL}/auth/login`,
          `username=${encodeURIComponent(authEmail)}&password=${encodeURIComponent(authPassword)}`,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        setUserEmail(authEmail);
        setToken(loginRes.data.access_token);
      } else {
        const loginRes = await axios.post(
          `${API_BASE_URL}/auth/login`,
          `username=${encodeURIComponent(authEmail)}&password=${encodeURIComponent(authPassword)}`,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        setUserEmail(authEmail);
        setToken(loginRes.data.access_token);
      }
      // Reset inputs
      setAuthEmail('');
      setAuthPassword('');
    } catch (err) {
      setAuthError(err.response?.data?.detail || 'Authentication failed. Please verify credentials.');
    }
  };

  const fetchDashboardStats = async () => {
    setLoadingStats(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/dashboard/stats`);
      setDashboardStats(res.data);
    } catch (err) {
      console.error('Error loading statistics', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchResumes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/resumes`);
      setResumes(res.data);
      if (res.data.length > 0 && !selectedResumeId) {
        setSelectedResumeId(res.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching resumes', err);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadError('');
    
    const formData = new FormData();
    formData.append('file', uploadFile);
    
    try {
      const res = await axios.post(`${API_BASE_URL}/resumes/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResumes([res.data, ...resumes]);
      setSelectedResumeId(res.data.id);
      setUploadFile(null);
      fetchDashboardStats();
      setCurrentTab('dashboard'); // Redirect to dashboard to analyze
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Upload and extraction failed. Ensure it is a valid PDF.');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedResumeId || !jobDescription.trim()) return;
    setAnalyzing(true);
    setAnalysisError('');
    setAnalysisResult(null);

    try {
      const res = await axios.post(`${API_BASE_URL}/analysis/analyze`, {
        resume_id: parseInt(selectedResumeId),
        job_description: jobDescription
      });
      setAnalysisResult(res.data);
      fetchDashboardStats();
    } catch (err) {
      setAnalysisError(err.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeleteResume = async (resumeId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this resume? All its analysis history will be permanently deleted.')) return;
    try {
      await axios.delete(`${API_BASE_URL}/resumes/${resumeId}`);
      setResumes(resumes.filter(r => r.id !== resumeId));
      if (selectedResumeId === resumeId) {
        setSelectedResumeId(resumes[0]?.id || null);
      }
      setAnalysisResult(null);
      fetchDashboardStats();
    } catch (err) {
      console.error('Failed to delete resume', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Auth Screen layout
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
        {/* Background Decorative Gradients */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px]"></div>

        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3">
              <Award className="h-6 w-6 text-white animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              ATS Resume Analyzer
            </h1>
            <p className="text-slate-400 text-sm mt-1">Production-ready AI Resume Scorer</p>
          </div>

          {authError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{authError}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                <input 
                  type="email" 
                  required
                  placeholder="name@company.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-medium rounded-lg text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              {authView === 'signup' ? (
                <>
                  <UserPlus className="h-4 w-4" /> Create Account
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" /> Log In
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <button 
              onClick={() => {
                setAuthView(authView === 'login' ? 'signup' : 'login');
                setAuthError('');
              }}
              className="text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors"
            >
              {authView === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Main View
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-hidden print:bg-white print:text-black">
      {/* Print-only Header */}
      <div className="hidden print:block mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold">ATS Resume Evaluation Report</h1>
        <p className="text-gray-500">System Evaluation Date: {new Date().toLocaleDateString()}</p>
        <p className="text-gray-500">Applicant Account: {userEmail}</p>
      </div>

      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none print:hidden"></div>
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none print:hidden"></div>

      {/* Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center shadow-md">
              <Award className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              ATS Analyzer
            </span>
          </div>

          <div className="flex items-center gap-6">
            <nav className="flex gap-1 text-sm font-medium">
              <button 
                onClick={() => setCurrentTab('dashboard')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${currentTab === 'dashboard' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setCurrentTab('upload')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${currentTab === 'upload' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Upload Resume
              </button>
            </nav>

            <div className="h-6 w-px bg-slate-800"></div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-xs text-slate-400">Authenticated as</span>
                <span className="text-xs font-semibold text-slate-300">{userEmail}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full z-10 relative">
        {currentTab === 'dashboard' && (
          <div className="space-y-8 print:space-y-4">
            {/* Top Stat HUD Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 print:grid-cols-3">
              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-xl p-6 flex items-center justify-between shadow-xl">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average ATS Score</span>
                  <div className="text-3xl font-extrabold text-indigo-400 mt-1">
                    {dashboardStats?.average_ats_score ? `${dashboardStats.average_ats_score}%` : 'N/A'}
                  </div>
                </div>
                <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
                  <Award className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-xl p-6 flex items-center justify-between shadow-xl">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Resumes</span>
                  <div className="text-3xl font-extrabold text-emerald-400 mt-1">
                    {dashboardStats?.total_resumes ?? 0}
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
                  <FileText className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-xl p-6 flex items-center justify-between shadow-xl">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Analyses</span>
                  <div className="text-3xl font-extrabold text-violet-400 mt-1">
                    {dashboardStats?.total_analyses ?? 0}
                  </div>
                </div>
                <div className="p-3 bg-violet-500/10 rounded-lg border border-violet-500/20 text-violet-400">
                  <BarChart2 className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Analysis Workspace (Main action panel) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
              {/* Left Column: Select Resume + Paste Job Description */}
              <div className="lg:col-span-5 space-y-6 print:hidden">
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-xl p-6 shadow-xl space-y-6">
                  <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800/80 pb-3">
                    <FileText className="h-5 w-5 text-indigo-400" />
                    1. Select Resume
                  </h2>
                  
                  {resumes.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-800 rounded-lg bg-slate-950/40">
                      <p className="text-slate-400 text-sm">No resumes uploaded yet.</p>
                      <button 
                        onClick={() => setCurrentTab('upload')}
                        className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                      >
                        Upload one now
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                      {resumes.map(r => (
                        <div 
                          key={r.id}
                          onClick={() => {
                            setSelectedResumeId(r.id);
                            setAnalysisResult(null);
                          }}
                          className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${selectedResumeId === r.id ? 'bg-indigo-500/10 border-indigo-500/50 text-slate-100' : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:border-slate-700'}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className={`h-4.5 w-4.5 shrink-0 ${selectedResumeId === r.id ? 'text-indigo-400' : 'text-slate-500'}`} />
                            <span className="text-sm font-medium truncate">{r.filename}</span>
                          </div>
                          <button 
                            onClick={(e) => handleDeleteResume(r.id, e)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors rounded hover:bg-slate-900"
                            title="Delete resume"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800/80 pt-2 pb-3">
                    <Briefcase className="h-5 w-5 text-emerald-400" />
                    2. Paste Job Description
                  </h2>

                  <div className="space-y-4">
                    <textarea 
                      placeholder="Paste the target job description details here to assess keyword gaps and compute semantic similarity scoring..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      rows={8}
                      className="w-full p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm resize-none"
                    />

                    {analysisError && (
                      <p className="text-red-400 text-xs mt-1">{analysisError}</p>
                    )}

                    <button 
                      onClick={handleAnalyze}
                      disabled={analyzing || !selectedResumeId || !jobDescription.trim()}
                      className="w-full py-3 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      {analyzing ? (
                        <>
                          <RefreshCw className="h-4.5 w-4.5 animate-spin" /> Analyzing Match...
                        </>
                      ) : (
                        <>
                          Run Engine Analysis <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic Analysis Report */}
              <div className="lg:col-span-7 print:block">
                {!analysisResult ? (
                  <div className="h-full min-h-[400px] border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-8 bg-slate-900/10 print:hidden">
                    <Award className="h-12 w-12 text-slate-700 animate-bounce mb-3" />
                    <h3 className="text-lg font-semibold text-slate-400">Ready to Analyze</h3>
                    <p className="text-slate-500 text-sm max-w-sm mt-2">
                      Upload your resume PDF, paste the job description, and click analysis to display metrics here.
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-xl p-6 shadow-xl space-y-8 print:border-none print:bg-transparent print:p-0 print:shadow-none">
                    {/* Report Header actions */}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 print:hidden">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                        <span className="font-bold text-slate-200">Evaluation Finished</span>
                      </div>
                      <button 
                        onClick={handlePrint}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                      >
                        <Download className="h-4 w-4" /> Download Analysis Report
                      </button>
                    </div>

                    {/* ATS Score Section & Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center print:grid-cols-12 print:gap-4">
                      {/* Interactive ATS Score Dial */}
                      <div className="md:col-span-5 flex flex-col items-center justify-center py-4 print:col-span-4">
                        <div className="relative h-36 w-36 flex items-center justify-center">
                          {/* Outer Circular SVG Track */}
                          <svg className="absolute w-full h-full transform -rotate-90">
                            <circle 
                              cx="72" cy="72" r="60" 
                              stroke="#1e293b" strokeWidth="10" fill="transparent" 
                            />
                            <circle 
                              cx="72" cy="72" r="60" 
                              stroke="url(#ats-gradient)" strokeWidth="12" fill="transparent" 
                              strokeDasharray={2 * Math.PI * 60}
                              strokeDashoffset={2 * Math.PI * 60 * (1 - analysisResult.ats_score / 100)}
                              strokeLinecap="round"
                            />
                            <defs>
                              <linearGradient id="ats-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#10b981" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="text-center z-10">
                            <span className="text-4xl font-extrabold text-white tracking-tight">{analysisResult.ats_score}</span>
                            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">ATS Score</div>
                          </div>
                        </div>
                      </div>

                      {/* Score Breakdown (Semantic vs. Keywords vs. Skill matching) */}
                      <div className="md:col-span-7 space-y-4 print:col-span-8">
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Match Breakdown</h4>
                        <div className="space-y-3.5">
                          {analysisResult.score_breakdown.semantic_match !== null && (
                            <div>
                              <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-slate-400">Semantic Alignment (Sentence Transformers)</span>
                                <span className="text-indigo-400">{analysisResult.score_breakdown.semantic_match}%</span>
                              </div>
                              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-indigo-500 rounded-full transition-all" 
                                  style={{ width: `${analysisResult.score_breakdown.semantic_match}%` }}
                                ></div>
                              </div>
                            </div>
                          )}

                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-slate-400">Keyword Density (TF-IDF)</span>
                              <span className="text-emerald-400">{analysisResult.score_breakdown.keyword_match}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full transition-all" 
                                style={{ width: `${analysisResult.score_breakdown.keyword_match}%` }}
                              ></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-slate-400">Core Technical Skill Overlap</span>
                              <span className="text-violet-400">{analysisResult.score_breakdown.skill_match}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-violet-500 rounded-full transition-all" 
                                style={{ width: `${analysisResult.score_breakdown.skill_match}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Explainable AI Insights */}
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-5 space-y-3.5 print:bg-gray-100 print:border-gray-300 print:text-black">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 print:text-indigo-600">Explainable AI Insights</h4>
                      <ul className="space-y-2.5">
                        {analysisResult.match_explanation.insights.map((insight, idx) => (
                          <li key={idx} className="flex gap-2.5 text-sm text-slate-300 print:text-gray-800">
                            <span className="text-indigo-500 font-bold shrink-0">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Skill Comparison Badges (Matched vs Missing) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
                      {/* Matched Skills */}
                      <div className="border border-slate-800/60 rounded-xl p-5 bg-slate-950/20 print:border-gray-300 print:text-black">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 print:text-emerald-700">Matched Skills</h4>
                        {(analysisResult.matched_skills ?? []).length === 0 ? (
                          <p className="text-xs text-slate-500 italic">No direct matches identified in technical catalogs.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {(analysisResult.matched_skills ?? []).map((skill, idx) => (
                              <span key={idx} className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-[11px] font-semibold print:bg-emerald-100 print:text-emerald-800">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Missing Skills */}
                      <div className="border border-slate-800/60 rounded-xl p-5 bg-slate-950/20 print:border-gray-300 print:text-black">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3 print:text-red-700">Missing Skills</h4>
                        {(analysisResult.missing_skills ?? []).length === 0 ? (
                          <p className="text-xs text-slate-500 italic">Outstanding coverage - no missing skills detected!</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {(analysisResult.missing_skills ?? []).map((skill, idx) => (
                              <span key={idx} className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-[11px] font-semibold print:bg-red-100 print:text-red-800">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Suggestions Section */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <Award className="h-4.5 w-4.5 text-amber-500" /> Actionable Resume Recommendations
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-1">
                        {/* Skills suggestions */}
                        {(analysisResult.suggestions?.skills ?? []).length > 0 && (
                          <div className="p-4 bg-slate-950/20 border border-slate-850 rounded-xl space-y-2.5 print:border-gray-300 print:text-black">
                            <div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                              <CheckCircle className="h-4 w-4 text-slate-500" /> Skills Section
                            </div>
                            <ul className="space-y-2">
                              {(analysisResult.suggestions?.skills ?? []).map((s, idx) => (
                                <li key={idx} className="text-xs text-slate-400 flex gap-2 print:text-gray-700">
                                  <span className="text-indigo-400 shrink-0">•</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Experience suggestions */}
                        {(analysisResult.suggestions?.experience ?? []).length > 0 && (
                          <div className="p-4 bg-slate-950/20 border border-slate-850 rounded-xl space-y-2.5 print:border-gray-300 print:text-black">
                            <div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                              <Briefcase className="h-4 w-4 text-slate-500" /> Experience Formatting
                            </div>
                            <ul className="space-y-2">
                              {(analysisResult.suggestions?.experience ?? []).map((s, idx) => (
                                <li key={idx} className="text-xs text-slate-400 flex gap-2 print:text-gray-700">
                                  <span className="text-indigo-400 shrink-0">•</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Projects & Certifications suggestions */}
                        {(analysisResult.suggestions?.projects_certs ?? []).length > 0 && (
                          <div className="p-4 bg-slate-950/20 border border-slate-850 rounded-xl space-y-2.5 print:border-gray-300 print:text-black">
                            <div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                              <GraduationCap className="h-4 w-4 text-slate-500" /> Projects & Credentials
                            </div>
                            <ul className="space-y-2">
                             {(analysisResult.suggestions?.projects_certs ?? []).map((s, idx) => (
                                <li key={idx} className="text-xs text-slate-400 flex gap-2 print:text-gray-700">
                                  <span className="text-indigo-400 shrink-0">•</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Formatting suggestions */}
                        {(analysisResult.suggestions?.formatting ?? []).length > 0 && (
                          <div className="p-4 bg-slate-950/20 border border-slate-850 rounded-xl space-y-2.5 print:border-gray-300 print:text-black">
                            <div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                              <FileText className="h-4 w-4 text-slate-500" /> Structure & Layout
                            </div>
                            <ul className="space-y-2">
                              {(analysisResult.suggestions?.formatting ?? []).map((s, idx) => (
                                <li key={idx} className="text-xs text-slate-400 flex gap-2 print:text-gray-700">
                                  <span className="text-indigo-400 shrink-0">•</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Section: Historical Analysis Logs */}
            {dashboardStats?.recent_analyses?.length > 0 && (
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-xl p-6 shadow-xl print:hidden">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-800/80 pb-3">
                  <BarChart2 className="h-5 w-5 text-indigo-400" />
                  Recent Evaluations
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                        <th className="py-3 px-4">Evaluation Date</th>
                        <th className="py-3 px-4">Job Description Summary</th>
                        <th className="py-3 px-4 text-center">ATS Match Score</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {dashboardStats.recent_analyses.map((analysis) => (
                        <tr key={analysis.id} className="hover:bg-slate-900/30 text-slate-300 transition-colors">
                          <td className="py-3.5 px-4 font-medium">
                            {new Date(analysis.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 max-w-xs truncate">
                            {analysis.job_description}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${analysis.ats_score >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : analysis.ats_score >= 60 ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                              {analysis.ats_score}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button 
                              onClick={async () => {
                                setAnalysisResult(analysis);
                                setSelectedResumeId(analysis.resume_id);
                                // Populate JD text area
                                setJobDescription(analysis.job_description);
                              }}
                              className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              Load Report <ChevronRight className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Tab view */}
        {currentTab === 'upload' && (
          <div className="max-w-xl mx-auto py-8">
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2.5 border-b border-slate-800/80 pb-4 mb-6">
                <Upload className="h-5.5 w-5.5 text-indigo-400" />
                Upload Resume (PDF)
              </h2>

              {uploadError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{uploadError}</p>
                </div>
              )}

              <form onSubmit={handleFileUpload} className="space-y-6">
                <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-xl p-8 bg-slate-950/20 text-center transition-all relative">
                  <input 
                    type="file" 
                    accept=".pdf"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400">
                      <FileText className="h-8 w-8 text-indigo-400" />
                    </div>
                    {uploadFile ? (
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{uploadFile.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-slate-300">Drag & Drop Resume PDF</p>
                        <p className="text-xs text-slate-500 mt-1">Accepts standard digital or scanned PDF resumes</p>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="h-4.5 w-4.5 animate-spin" /> Processing OCR & parsing components...
                    </>
                  ) : (
                    <>
                      Upload & Extract Data
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-900/60 py-6 text-center text-xs text-slate-500 bg-slate-950 mt-auto print:hidden">
        <p>© 2026 AI Resume Analyzer. Production Grade. Designed using Tailwind CSS v4.</p>
      </footer>
    </div>
  );
}
