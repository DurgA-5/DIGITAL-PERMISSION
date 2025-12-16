import React, { useState, useEffect } from 'react';
import { initStorage, getCurrentUser, logoutUser } from './services/storageService';
import { User, UserRole } from './types';
import Login from './pages/Login';
import Layout from './components/Layout';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import CRDashboard from './pages/CRDashboard';
import GeneralTeacherDashboard from './pages/GeneralTeacherDashboard';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initStorage();
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  // Logic to redirect user to specific dashboard based on role
  const renderDashboard = () => {
    if (!user) return null;

    switch (user.role) {
      case UserRole.STUDENT:
        return <StudentDashboard user={user} />;
      case UserRole.CLASS_TEACHER:
        return <TeacherDashboard user={user} />;
      case UserRole.CR:
        return <CRDashboard user={user} />;
      case UserRole.TEACHER:
        return <GeneralTeacherDashboard user={user} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            Unknown Role: Please contact administrator.
          </div>
        );
    }
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-indigo-600 font-medium">Loading System...</div>;
  }

  if (!user) {
    return (
      <Layout user={null} onLogout={() => {}}>
        <Login onLogin={handleLogin} />
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={handleLogout}>
      {renderDashboard()}
    </Layout>
  );
};

export default App;