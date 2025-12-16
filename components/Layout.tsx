import React from 'react';
import { User, UserRole } from '../types';

interface LayoutProps {
  user: User | null;
  onLogout: () => void;
  children: React.ReactNode;
  isBackendConnected?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children, isBackendConnected = false }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <nav className="bg-indigo-700 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <a href="https://mits.ac.in/" target="_blank" rel="noopener noreferrer" className="flex items-center">
                <img 
                  src="https://share.google/RvUIubxcOtmWekTbZ" 
                  alt="MITS" 
                  className="h-10 w-auto bg-white rounded p-1"
                  onError={(e) => {
                    // Fallback to text if image fails
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML += '<div class="h-10 w-10 bg-white text-indigo-700 rounded flex items-center justify-center font-bold text-xs">MITS</div>';
                  }}
                />
              </a>
              <span className="font-bold text-lg sm:text-xl tracking-tight leading-tight">MITS Dept of CAI <span className="hidden sm:inline">- Permission Portal</span></span>
            </div>
            
            {user && (
              <div className="flex items-center space-x-4">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-indigo-200">{user.role.replace('_', ' ')}</div>
                </div>
                <button 
                  onClick={onLogout}
                  className="bg-indigo-800 hover:bg-indigo-900 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 gap-4">
          <div>
             © {new Date().getFullYear()} MITS Dept of CAI. Developed by the students of AI Department.
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${isBackendConnected ? 'bg-green-500 animate-pulse' : 'bg-orange-400'}`}></span>
            <span className={`font-medium ${isBackendConnected ? 'text-green-700' : 'text-orange-600'}`}>
              {isBackendConnected ? 'System Online (SQL)' : 'Offline Mode (Local)'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;