import React, { useState } from 'react';
import { loginWithPassword, loginWithGoogle } from '../services/storageService';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'college' | 'password'>('college');
  
  // Password Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // College Mail State
  const [collegeEmail, setCollegeEmail] = useState('');

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = loginWithPassword(email, password);
    if (result.success && result.user) {
      onLogin(result.user);
    } else {
      setError(result.error || 'Login failed');
    }
  };

  const handleCollegeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Reuse existing domain validation logic
    const result = loginWithGoogle(collegeEmail);
    if (result.success && result.user) {
      onLogin(result.user);
    } else {
      setError(result.error || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        
        {/* Left Side - Brand & Info */}
        <div className="md:w-1/2 bg-indigo-700 p-8 text-white flex flex-col justify-center relative overflow-hidden">
          <div className="relative z-10">
            <a href="https://mits.ac.in/" target="_blank" rel="noopener noreferrer" className="block mb-6 w-fit">
              <img 
                src="https://share.google/RvUIubxcOtmWekTbZ" 
                alt="MITS CAI Logo" 
                className="h-20 w-auto bg-white rounded-lg p-2 shadow-md object-contain"
                onError={(e) => {
                  // Fallback if the Google Share link doesn't resolve to an image directly
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML += '<div class="h-20 w-20 bg-white text-indigo-700 rounded-lg flex items-center justify-center font-bold text-xl">MITS</div>';
                }}
              />
            </a>
            <h1 className="text-3xl font-extrabold mb-4">MITS Department of CAI Permission Approval Portal</h1>
            <p className="text-indigo-100 mb-8 leading-relaxed">
              Manage permissions, approvals, and attendance securely with AI verification.
            </p>
            <div className="space-y-4 text-sm opacity-90">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </div>
                <span>Role-based Security</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <span>Auto-Expiry Logic</span>
              </div>
            </div>
          </div>
          {/* Decorative Circle */}
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600 rounded-full opacity-50 blur-3xl"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500 rounded-full opacity-50 blur-3xl"></div>
        </div>

        {/* Right Side - Login Forms */}
        <div className="md:w-1/2 p-8 bg-white flex flex-col justify-center">
          
          {/* Tab Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-lg mb-8">
            <button 
              onClick={() => { setActiveTab('college'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'college' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Students & Staff
            </button>
            <button 
              onClick={() => { setActiveTab('password'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'password' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Admin (Teacher/CR)
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
              {error}
            </div>
          )}

          {/* VIEW 1: COLLEGE LOGIN */}
          {activeTab === 'college' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">Institutional Access</h2>
                <p className="text-sm text-gray-500 mt-1">Sign in using your official College Mail ID</p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                <p className="mb-2"><strong>Authentication:</strong></p>
                <form onSubmit={handleCollegeLogin} className="flex flex-col gap-2">
                   <input 
                     type="email" 
                     placeholder="e.g. 21691A05AB@mits.ac.in" 
                     required
                     className="border border-blue-200 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                     value={collegeEmail}
                     onChange={(e) => setCollegeEmail(e.target.value)}
                   />
                   <button 
                    type="submit"
                    className="flex items-center justify-center gap-3 w-full bg-indigo-600 text-white border border-transparent font-medium py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Sign in with College Mail ID
                  </button>
                </form>
              </div>

              <div className="mt-4 text-center">
                 <p className="text-xs text-gray-400">Demo Accounts:</p>
                 <div className="flex gap-2 justify-center mt-2">
                    <button onClick={() => setCollegeEmail('23691A3101@mits.ac.in')} className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">Student</button>
                    <button onClick={() => setCollegeEmail('staff.ai@mits.ac.in')} className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">Gen Teacher</button>
                 </div>
              </div>
            </div>
          )}

          {/* VIEW 2: PASSWORD LOGIN (ADMIN) */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4 animate-fadeIn">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Secure Role Access</h2>
                <p className="text-sm text-gray-500 mt-1">Class Teachers & CRs Only</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Official Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  placeholder="name@mits.ac.in"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Secure Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-800 hover:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Login to Dashboard
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;