import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { EmailJob, PaginationInfo } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { TableSkeleton } from '../components/SkeletonLoader';
import { Search, Send, ChevronLeft, ChevronRight, ExternalLink, Info } from 'lucide-react';
import { format } from 'date-fns';

export const SentEmails: React.FC = () => {
  const [emails, setEmails] = useState<EmailJob[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, page: 1, limit: 10, pages: 1 });
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedJob, setSelectedJob] = useState<EmailJob | null>(null);

  const fetchSent = async (page: number = 1, searchQuery: string = search, status: string = statusFilter) => {
    try {
      setLoading(true);
      const data = await apiService.getSentEmails({ search: searchQuery, status, page, limit: 10 });
      setEmails(data.emails);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSent(1, search, statusFilter);
  }, [search, statusFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search sent emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === '' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Logs
          </button>
          <button
            onClick={() => setStatusFilter('SENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'SENT' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sent
          </button>
          <button
            onClick={() => setStatusFilter('FAILED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'FAILED' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Failed
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : emails.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3 text-indigo-400">
              <Send className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-white text-base">No sent email logs</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Emails processed by worker will appear in this execution log table.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/60 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Recipient</th>
                  <th className="py-4 px-6">Subject</th>
                  <th className="py-4 px-6">Sent Timestamp</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {emails.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-indigo-300">{job.recipient}</td>
                    <td className="py-4 px-6 font-semibold text-white max-w-xs truncate">{job.subject}</td>
                    <td className="py-4 px-6 text-slate-300 font-mono">
                      {job.sentAt ? format(new Date(job.sentAt), 'MMM dd, yyyy • hh:mm:ss a') : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                        title="View Details"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-950/50 flex items-center justify-between">
            <p className="text-xs text-slate-400 font-mono">
              Page {pagination.page} of {pagination.pages} ({pagination.total} total logs)
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchSent(pagination.page - 1)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchSent(pagination.page + 1)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedJob && (
        <Modal isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} title="Email Dispatch Inspector">
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Recipient</span>
                <span className="font-mono font-bold text-indigo-400">{selectedJob.recipient}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                <StatusBadge status={selectedJob.status} />
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Subject</span>
              <p className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-bold text-white">
                {selectedJob.subject}
              </p>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Message Body</span>
              <div
                className="p-4 bg-slate-950 border border-slate-800 rounded-xl max-h-48 overflow-y-auto font-sans leading-relaxed text-slate-200"
                dangerouslySetInnerHTML={{ __html: selectedJob.body.replace(/\n/g, '<br/>') }}
              />
            </div>

            {selectedJob.errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl">
                <span className="font-bold block">Error Details:</span>
                <p className="font-mono text-[11px] mt-0.5">{selectedJob.errorMessage}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
