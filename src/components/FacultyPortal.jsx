import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Phone, Lock, ChevronRight, GraduationCap, UserPlus, LogIn, Mail, AlertCircle, Info, Eye, EyeOff, User, Building, BookOpen } from 'lucide-react';

const FacultyPortal = ({ onLoginSuccess }) => {
  const [authMethod, setAuthMethod] = useState('email'); // 'email' OR 'phone'
  const [isSignUp, setIsSignUp] = useState(false);
  
  // User profile data (for signup)
  const [fullName, setFullName] = useState('');
  const [branch, setBranch] = useState('');
  const [role, setRole] = useState('Professor');
  
  // Email method state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Phone method state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  
  const [step, setStep] = useState('details'); // 'details' or 'otp'
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Branch options
  const branchOptions = [
    { id: 'CSE', name: 'Computer Science & Engineering' },
    { id: 'CS-AI', name: 'Computer Science (AI & ML)' },
    { id: 'CS-DS', name: 'Computer Science (Data Science)' },
    { id: 'AI-ML', name: 'AI & Machine Learning' },
    { id: 'ECE', name: 'Electronics & Communication Engineering' },
    { id: 'ME', name: 'Mechanical Engineering' },
    { id: 'EE', name: 'Electrical Engineering' },
    { id: 'CE', name: 'Civil Engineering' }
  ];

  // Role options
  const roleOptions = [
    { id: 'Professor', name: 'Professor' },
    { id: 'Associate Professor', name: 'Associate Professor' },
    { id: 'Assistant Professor', name: 'Assistant Professor' },
    { id: 'Lecturer', name: 'Lecturer' },
    { id: 'HOD', name: 'Head of Department' }
  ];

  // Format phone number to E.164 format
  const formatPhoneNumber = (phone) => {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('91') && cleaned.length > 10) {
        cleaned = '+' + cleaned;
      } else if (cleaned.startsWith('0')) {
        cleaned = '+91' + cleaned.substring(1);
      } else {
        cleaned = '+91' + cleaned;
      }
    }
    
    return cleaned;
  };

  // Initialize reCAPTCHA
  const setupRecaptcha = (containerId) => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }
    
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      'size': 'invisible',
      'callback': (response) => {
        console.log("reCAPTCHA solved");
      },
      'expired-callback': () => {
        setError('reCAPTCHA expired. Please try again.');
      }
    });
  };

  // Save user data to Firestore
  const saveUserToFirestore = async (user, userData) => {
    try {
      await setDoc(doc(db, 'faculty', user.uid), {
        uid: user.uid,
        email: userData.email,
        displayName: userData.fullName,
        phone: userData.phone || null,
        branch: userData.branch || null,
        role: userData.role || 'Professor',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('User data saved to Firestore');
    } catch (err) {
      console.error('Error saving user to Firestore:', err);
    }
  };

  // Email Login/Signup
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      let user;
      if (isSignUp) {
        // Sign up with email and password
        const result = await createUserWithEmailAndPassword(auth, email, password);
        user = result.user;
        
        // Update display name
        await updateProfile(user, {
          displayName: fullName || email.split('@')[0]
        });
        
        // Save user data to Firestore
        await saveUserToFirestore(user, {
          email: email,
          fullName: fullName || email.split('@')[0],
          branch: branch,
          role: role,
          phone: null
        });
      } else {
        // Sign in with email and password
        const result = await signInWithEmailAndPassword(auth, email, password);
        user = result.user;
      }
      
      localStorage.setItem('userEmail', email);
      
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      console.error("Email Auth Error:", err.code, err.message);
      
      switch (err.code) {
        case 'auth/invalid-email':
          setError('Invalid email address format.');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email. Please sign up first.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password. Please try again.');
          break;
        case 'auth/email-already-in-use':
          setError('An account with this email already exists.');
          break;
        case 'auth/weak-password':
          setError('Password should be at least 6 characters.');
          break;
        case 'auth/network-request-failed':
          setError('Network error. Please check your internet connection.');
          break;
        case 'auth/missing-email':
          setError('Please enter your email address.');
          break;
        default:
          setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Phone OTP - Send
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(formattedPhone)) {
        setError('Invalid phone format. Use: +91 9876543210 or 09876543210');
        setIsLoading(false);
        return;
      }

      setupRecaptcha('recaptcha-container');
      const appVerifier = window.recaptchaVerifier;

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep('otp');
      setError('');
    } catch (err) {
      console.error("SMS Error:", err.code, err.message);
      
      switch (err.code) {
        case 'auth/invalid-phone-number':
          setError('Invalid phone number. Please check and try again.');
          break;
        case 'auth/too-many-requests':
          setError('Too many attempts. Please try again later or use a different number.');
          break;
        case 'auth/network-request-failed':
          setError('Network error. Please check your internet connection.');
          break;
        case 'auth/captcha-check-failed':
          setError('reCAPTCHA verification failed. Please try again.');
          break;
        case 'auth/quota-exceeded':
          setError('SMS quota exceeded. Please try again later.');
          break;
        default:
          if (err.message.includes('format')) {
            setError('Phone format not accepted. Try: +919876543210');
          } else {
            setError(`Error: ${err.message}. Make sure phone number is in test list in Firebase Console.`);
          }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Phone OTP - Verify
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;
      
      // If sign up, save user data to Firestore
      if (isSignUp && user) {
        await updateProfile(user, {
          displayName: fullName || phoneNumber
        });
        
        await saveUserToFirestore(user, {
          email: '',
          fullName: fullName || phoneNumber,
          branch: branch,
          role: role,
          phone: formatPhoneNumber(phoneNumber)
        });
      }
      
      localStorage.setItem('userPhone', formatPhoneNumber(phoneNumber));
      
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      setError("Invalid OTP. Please try again.");
      console.error("OTP Error:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setEmail('');
    setPassword('');
    setPhoneNumber('');
    setOtp('');
    setStep('details');
    setFullName('');
    setBranch('');
    setRole('Professor');
  };

  const switchAuthMethod = (method) => {
    setAuthMethod(method);
    setError('');
    setEmail('');
    setPassword('');
    setPhoneNumber('');
    setOtp('');
    setStep('details');
    setFullName('');
    setBranch('');
    setRole('Professor');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-slate-100 flex flex-col items-center justify-center p-6">
      {/* Hidden container for reCAPTCHA */}
      <div id="recaptcha-container"></div>

      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Faculty Assessment System</h1>
          <p className="text-slate-600 mt-2">
            {authMethod === 'email' ? 'Login with Email' : 'Login with Phone OTP'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          {/* Auth Method Toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => switchAuthMethod('email')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                authMethod === 'email' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              onClick={() => switchAuthMethod('phone')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                authMethod === 'phone' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Phone className="w-4 h-4" />
              Phone
            </button>
          </div>

          {/* Sign In / Sign Up Toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => !isSignUp || toggleMode()}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                !isSignUp 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            <button
              onClick={() => isSignUp || toggleMode()}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                isSignUp 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Sign Up
            </button>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              {authMethod === 'phone' && step === 'otp' 
                ? 'Phone Verification' 
                : (isSignUp ? 'Create New Account' : 'Welcome Back')}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {authMethod === 'phone' && step === 'otp' 
                ? 'Enter the 6-digit code sent to your phone'
                : (isSignUp 
                    ? `Enter your ${authMethod} to create account` 
                    : `Enter your ${authMethod} to sign in`)}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* EMAIL LOGIN FORM */}
          {authMethod === 'email' && step === 'details' && (
            <form onSubmit={handleEmailAuth} className="space-y-5">
              {/* Additional fields for Sign Up */}
              {isSignUp && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Dr. John Doe"
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required={isSignUp}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Branch/Department
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <select 
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        required={isSignUp}
                      >
                        <option value="">Select Branch</option>
                        {branchOptions.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Role
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <select 
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        required={isSignUp}
                      >
                        {roleOptions.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input 
                    type="email" 
                    placeholder="faculty@college.edu"
                    className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Enter your password"
                    className="w-full pl-11 pr-12 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/25"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    {isSignUp ? 'Create Account' : 'Sign In'} <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* PHONE LOGIN FORM */}
          {authMethod === 'phone' && step === 'details' && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              {/* Additional fields for Sign Up */}
              {isSignUp && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Dr. John Doe"
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required={isSignUp}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Branch/Department
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <select 
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        required={isSignUp}
                      >
                        <option value="">Select Branch</option>
                        {branchOptions.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Role
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <select 
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        required={isSignUp}
                      >
                        {roleOptions.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number (for OTP)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input 
                    type="tel" 
                    placeholder="+91 98765 43210"
                    className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="mt-2 p-2 bg-blue-50 rounded-lg flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    Enter phone with country code:<br/>
                    • +91 9876543210<br/>
                    • 09876543210
                  </p>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/25"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    Send OTP <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* PHONE OTP VERIFICATION */}
          {authMethod === 'phone' && step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Enter 6-Digit OTP
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="000000"
                    className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-center tracking-[0.5em] font-bold text-lg"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Phone:</span> {formatPhoneNumber(phoneNumber)}
                </p>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-100"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  'Verify & Login'
                )}
              </button>
              <button 
                type="button" 
                onClick={() => { setStep('details'); setError(''); setOtp(''); }}
                className="w-full text-slate-500 text-sm hover:text-primary-600 transition-colors"
              >
                Change Phone Number
              </button>
            </form>
          )}

          {/* Help Text */}
          <p className="text-center text-slate-500 text-sm mt-6">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button 
                  onClick={() => !isSignUp || toggleMode()}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                New faculty member?{' '}
                <button 
                  onClick={() => isSignUp || toggleMode()}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Create Account
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FacultyPortal;
