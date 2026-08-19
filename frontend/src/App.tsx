import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ScheduledEmails } from './pages/ScheduledEmails';
import { SentEmails } from './pages/SentEmails';
import { ComposeCampaign } from './pages/ComposeCampaign';
import { Loader2 } from 'lucide-react';

const ProtectedLayout: React.FC<{ children: React.ReactNode; pageTitle: string }> = ({
  children,
  pageTitle,
}) => {
  const { user, loading } = useAuth();

  const token = localStorage.getItem('reachinbox_token');
  const savedUser = localStorage.getItem('reachinbox_user');

  if (loading && !user && !savedUser && !token) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white space-y-4">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Loading ReachInbox Workspace...</p>
      </div>
    );
  }

  if (!user && !savedUser && !token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar title={pageTitle} />
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
};

const MainRoutes: React.FC = () => {
  const { user } = useAuth();
  const savedUser = localStorage.getItem('reachinbox_user');
  const token = localStorage.getItem('reachinbox_token');
  const isAuthenticated = !!(user || (savedUser && token));

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedLayout pageTitle="Workspace Dashboard">
            <Dashboard />
          </ProtectedLayout>
        }
      />
      <Route
        path="/scheduled"
        element={
          <ProtectedLayout pageTitle="Scheduled Queue">
            <ScheduledEmails />
          </ProtectedLayout>
        }
      />
      <Route
        path="/sent"
        element={
          <ProtectedLayout pageTitle="Delivery Logs">
            <SentEmails />
          </ProtectedLayout>
        }
      />
      <Route
        path="/compose"
        element={
          <ProtectedLayout pageTitle="Compose Campaign">
            <ComposeCampaign />
          </ProtectedLayout>
        }
      />
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
      />
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <MainRoutes />
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
