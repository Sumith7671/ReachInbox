import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { EmailJob, PaginationInfo } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { TableSkeleton } from '../components/SkeletonLoader';
import { Search, Clock, ChevronLeft, ChevronRight, RefreshCw, Play } from 'lucide-react';
import { format } from 'date-fns';

export const ScheduledEmails: React.FC = () => {
  const { showToast } = useToast();
  const [emails, setEmails] = useState<EmailJob[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, page: 1, limit: 10, pages: 1 });
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [dispatching, setDispatching] = useState<boolean>(false);

  const fetchScheduled = async (page: number = 1, searchQuery: string = search) => {
    try {
      setLoading(true);
      const data = await apiService.getScheduledEmails({ search: searchQuery, page, limit: 10 });
      setEmails(data.emails);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduled(1, search);
    const interval = setInterval(() => fetchScheduled(pagination.page, search), 2000);
    return () => clearInterval(interval);
  }, [search]);

  const handleTriggerDispatch = async () => {
    try {
      setDispatching(true);
      await apiService.triggerDispatch();
      showToast('Worker Triggered!', 'Immediate SMTP dispatch initiated for all scheduled jobs.', 'success');
      await fetchScheduled(1, search);
    } catch (err: any) {
      showToast('Dispatch error', 'Failed to trigger immediate worker dispatch.', 'error');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Search & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by recipient or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleTriggerDispatch}
            disabled={dispatching}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-sm disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${dispatching ? 'animate-spin' : ''}`} />
            <span>{dispatching ? 'Sending...' : 'Dispatch Now'}</span>
          </button>
          <button
            onClick={() => fetchScheduled(pagination.page, search)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : emails.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3 text-blue-600">
              <Clock className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-base">No scheduled emails found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are currently no active or pending email jobs in the scheduling queue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Target Recipient</th>
                  <th className="py-4 px-6">Subject</th>
                  <th className="py-4 px-6">Scheduled Execution</th>
                  <th className="py-4 px-6">Attempts</th>
                  <th className="py-4 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {emails.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-blue-700">{job.recipient}</td>
                    <td className="py-4 px-6 font-semibold text-slate-900 max-w-xs truncate">{job.subject}</td>
                    <td className="py-4 px-6 text-slate-600 font-mono">
                      {format(new Date(job.scheduledAt), 'MMM dd, yyyy • hh:mm:ss a')}
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-500">{job.attempts}</td>
                    <td className="py-4 px-6 text-right">
                      <StatusBadge status={job.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200/90 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-mono">
              Page {pagination.page} of {pagination.pages} ({pagination.total} total jobs)
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchScheduled(pagination.page - 1)}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchScheduled(pagination.page + 1)}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
