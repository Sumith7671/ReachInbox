import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { DashboardStats, EmailJob } from '../types';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { CardSkeleton, TableSkeleton } from '../components/SkeletonLoader';
import { Clock, Loader2, Send, AlertTriangle, PlusCircle, ArrowRight, Layers, RefreshCw, Zap, Play } from 'lucide-react';
import { format } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { showToast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [dispatching, setDispatching] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      const [statsData, scheduledData] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getScheduledEmails({ limit: 10 }),
      ]);
      setStats(statsData.stats);
      setRecentJobs(scheduledData.emails);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000); // Auto-refresh every 2s for live status updates!
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleTriggerDispatch = async () => {
    try {
      setDispatching(true);
      await apiService.triggerDispatch();
      showToast('Worker Triggered!', 'Immediate SMTP dispatch initiated for all scheduled jobs.', 'success');
      await fetchData();
    } catch (err: any) {
      showToast('Dispatch error', 'Failed to trigger immediate worker dispatch.', 'error');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Modern Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-8 text-white shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Real-Time Outreach Orchestrator</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              Campaign Execution & Delivery Logs
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Emails auto-dispatch automatically as their scheduled time arrives. Use the <strong>Dispatch Now</strong> trigger to flush pending queue jobs immediately.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleTriggerDispatch}
              disabled={dispatching}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${dispatching ? 'animate-spin' : ''}`} />
              <span>{dispatching ? 'Sending Now...' : 'Dispatch Now'}</span>
            </button>
            <button
              onClick={handleManualRefresh}
              className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link
              to="/compose"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/25"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Compose Campaign</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Scheduled Queue"
            value={stats?.scheduled ?? 0}
            subtitle="Pending execution"
            icon={Clock}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
            borderColor="border-amber-200/80"
          />
          <StatCard
            title="Processing"
            value={stats?.processing ?? 0}
            subtitle="Active SMTP dispatch"
            icon={Loader2}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
            borderColor="border-blue-200/80"
          />
          <StatCard
            title="Successfully Sent"
            value={stats?.sent ?? 0}
            subtitle="Delivered via Ethereal SMTP"
            icon={Send}
            iconBgColor="bg-emerald-50"
            iconColor="text-emerald-600"
            borderColor="border-emerald-200/80"
          />
          <StatCard
            title="Failed"
            value={stats?.failed ?? 0}
            subtitle="Delivery exceptions"
            icon={AlertTriangle}
            iconBgColor="bg-rose-50"
            iconColor="text-rose-600"
            borderColor="border-rose-200/80"
          />
        </div>
      )}

      {/* Live Scheduled & Processing Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Active Queue Jobs</h3>
              <p className="text-xs text-slate-500">Live list of emails scheduled for delivery</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerDispatch}
              disabled={dispatching}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
            >
              Trigger Dispatch Now
            </button>
            <Link
              to="/scheduled"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors pl-3 border-l border-slate-200"
            >
              <span>View Scheduled</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={4} />
          </div>
        ) : recentJobs.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3 text-indigo-600 shadow-inner">
              <Clock className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-slate-800 text-base">No active scheduled jobs in queue</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create your next campaign to watch queue job processing.
            </p>
            <Link
              to="/compose"
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4 text-indigo-400" />
              <span>Compose Campaign Now</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-4 px-6">Recipient</th>
                  <th className="py-4 px-6">Subject</th>
                  <th className="py-4 px-6">Scheduled Execution Time</th>
                  <th className="py-4 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recentJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 text-slate-900 font-bold">{job.recipient}</td>
                    <td className="py-4 px-6 text-slate-700 max-w-xs truncate">{job.subject}</td>
                    <td className="py-4 px-6 text-slate-500 text-xs font-mono">
                      {format(new Date(job.scheduledAt), 'MMM dd, yyyy • hh:mm:ss a')}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={job.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
