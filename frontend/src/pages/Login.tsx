import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ShieldCheck, Zap, Mail, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { loginWithDev } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState('alex.creator@reachinbox.ai');
  const [customName, setCustomName] = useState('Alex Rivera');

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      setLoading(true);
      await loginWithDev(customEmail, customName);
      showToast('Welcome back!', 'Authenticated successfully into ReachInbox.', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (err?.code === 'ECONNABORTED'
          ? 'Request timed out. Backend server is taking too long to respond.'
          : err?.message?.includes('Network Error')
          ? 'Cannot reach Backend API. Please verify the backend container is running.'
          : err?.message || 'Authentication failed');
      setErrorMessage(msg);
      showToast('Login Failed', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans text-white">
      {/* Left side: Value proposition */}
      <div className="lg:w-1/2 p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-r border-slate-800/80">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">ReachInbox</span>
          </div>

          <div className="mt-16 lg:mt-24 space-y-6 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>Production-Grade Scheduler</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-slate-100">
              Email outreach, scheduled <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-indigo-400">intelligently.</span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed">
              Schedule, automate, and monitor your email campaigns from one workspace. Built on Redis, BullMQ delayed queue workers, and strict rate-limiting guarantees.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs">
            <div className="flex items-center gap-2 text-brand-400 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Idempotent Execution</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Never sends duplicate emails, even across worker crashes or restarts.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <Mail className="w-4 h-4" />
              <span>Hourly Rate Limiting</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Atomic Redis counters ensure strict hourly throughput without dropping jobs.</p>
          </div>
        </div>
      </div>

      {/* Right side: Login Card */}
      <div className="lg:w-1/2 p-8 lg:p-16 flex items-center justify-center bg-slate-900">
        <div className="w-full max-w-md space-y-8 bg-slate-950 p-8 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Welcome back</h2>
            <p className="text-sm text-slate-400">Sign in to access your outreach workspace</p>
          </div>

          {/* Primary Google Auth Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-lg hover:shadow-xl group"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full"></div>
            <span className="bg-slate-950 px-3 text-xs text-slate-500 uppercase tracking-widest font-semibold">or dev demo access</span>
          </div>

          {/* Quick Demo Login Form */}
          <form onSubmit={handleDemoLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Demo Email</label>
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">User Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-400 text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-400 font-semibold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                  <span>Connecting to Backend...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-brand-400" />
                  <span>Instant Demo Login</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
