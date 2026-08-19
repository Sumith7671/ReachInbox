import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { EmailJob, PaginationInfo, DashboardStats } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import {
  Search,
  Send,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Eye,
  Mail,
  AlertTriangle,
  FileCode,
  Layers,
  Sparkles,
  Calendar,
  Clock,
  Filter,
  X,
  Radio,
  PlusCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export const SentEmails: React.FC = () => {
  const { showToast } = useToast();
  const [emails, setEmails] = useState<EmailJob[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, page: 1, limit: 10, pages: 1 });
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [selectedJob, setSelectedJob] = useState<EmailJob | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'preview' | 'meta' | 'json'>('preview');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');

  // Fetch Sent Logs and Stats
  const fetchData = async (page: number = pagination.page, searchQuery: string = search, status: string = statusFilter) => {
    try {
      const [sentData, statsData] = await Promise.all([
        apiService.getSentEmails({ search: searchQuery, status, page, limit: 10 }),
        apiService.getDashboardStats().catch(() => null),
      ]);
      setEmails(sentData.emails);
      setPagination(sentData.pagination);
      if (statsData) {
        setStats(statsData.stats);
      }
    } catch (err) {
      console.error('Error fetching sent email logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(1, search, statusFilter);
  }, [search, statusFilter]);

  // Live Auto-Sync polling
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      fetchData(pagination.page, search, statusFilter);
    }, 3000);
    return () => clearInterval(interval);
  }, [autoSync, pagination.page, search, statusFilter]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchData(pagination.page, search, statusFilter);
    showToast('Refreshed', 'Delivery logs up to date.', 'info');
  };

  const handleCopy = (text: string, id: string, label: string = 'Copied to clipboard') => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied', label, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportLogsAsCSV = () => {
    if (emails.length === 0) {
      showToast('Export Error', 'No logs available to export.', 'error');
      return;
    }

    const headers = ['ID', 'Recipient', 'Subject', 'Status', 'Sent At', 'Scheduled At', 'Attempts', 'SMTP Message ID', 'Error Message'];
    const csvRows = [
      headers.join(','),
      ...emails.map((job) =>
        [
          `"${job.id}"`,
          `"${job.recipient}"`,
          `"${(job.subject || '').replace(/"/g, '""')}"`,
          `"${job.status}"`,
          `"${job.sentAt || ''}"`,
          `"${job.scheduledAt || ''}"`,
          `"${job.attempts}"`,
          `"${job.smtpMessageId || ''}"`,
          `"${(job.errorMessage || '').replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reachinbox_sent_logs_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export Complete', 'Downloaded CSV delivery logs.', 'success');
  };

  const exportLogsAsJSON = () => {
    if (emails.length === 0) {
      showToast('Export Error', 'No logs available to export.', 'error');
      return;
    }
    const blob = new Blob([JSON.stringify(emails, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reachinbox_sent_logs_${format(new Date(), 'yyyy-MM-dd_HHmm')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export Complete', 'Downloaded JSON delivery telemetry.', 'success');
  };

  // Helper for generating deterministic avatar colors
  const getAvatarColor = (str: string) => {
    const colors = [
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-cyan-100 text-cyan-700 border-cyan-200',
      'bg-amber-100 text-amber-700 border-amber-200',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Statistics calculation
  const totalSentCount = stats?.sent ?? emails.filter((e) => e.status === 'SENT').length;
  const totalFailedCount = stats?.failed ?? emails.filter((e) => e.status === 'FAILED').length;
  const totalLogsCount = (stats?.sent ?? 0) + (stats?.failed ?? 0) || pagination.total;
  const successRate = totalLogsCount > 0 ? Math.round((totalSentCount / totalLogsCount) * 100) : 100;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-7 md:p-8 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Real-Time SMTP Telemetry</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              Dispatch & Delivery Logs
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Monitor complete email dispatch history, verify SMTP message IDs, inspect rendered message payloads, and track delivery health.
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Auto-Sync Toggle */}
            <button
              onClick={() => {
                setAutoSync(!autoSync);
                showToast(autoSync ? 'Auto-Sync Paused' : 'Live Sync Active', autoSync ? 'Live updates disabled.' : 'Polling every 3 seconds.', 'info');
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                autoSync
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Toggle 3-second live auto sync"
            >
              <Radio className={`w-3.5 h-3.5 ${autoSync ? 'animate-pulse text-emerald-400' : 'text-slate-500'}`} />
              <span>{autoSync ? 'Live Sync Active' : 'Live Sync Off'}</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={handleManualRefresh}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
              title="Refresh Logs Now"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            {/* Export Dropdown / Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <button
                onClick={exportLogsAsCSV}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                title="Export as CSV"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>CSV</span>
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={exportLogsAsJSON}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                title="Export as JSON"
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                <span>JSON</span>
              </button>
            </div>

            <Link
              to="/compose"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-500/25"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Campaign</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Total Processed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Dispatched</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalLogsCount}</div>
            <span className="text-[11px] text-slate-400 font-medium">All logged executions</span>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Successfully Sent */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivered</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{totalSentCount}</div>
            <span className="text-[11px] text-emerald-600 font-semibold inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {successRate}% success rate
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <Send className="w-6 h-6" />
          </div>
        </div>

        {/* Failed / Exceptions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Failed / Bounced</span>
            <div className="text-2xl font-black text-rose-600 mt-1">{totalFailedCount}</div>
            <span className="text-[11px] text-rose-600 font-semibold inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {totalLogsCount > 0 ? Math.round((totalFailedCount / totalLogsCount) * 100) : 0}% error rate
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Live Filter Indicator */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current View</span>
            <div className="text-base font-extrabold text-slate-900 mt-1">
              {statusFilter === '' ? 'All Records' : statusFilter === 'SENT' ? 'Sent Only' : 'Failed Only'}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Showing {emails.length} of {pagination.total}</span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
            <Filter className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search, Filter & Controls Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by recipient email or subject line..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500 bg-white placeholder-slate-400 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto shrink-0">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === ''
                ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Logs
          </button>
          <button
            onClick={() => setStatusFilter('SENT')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'SENT'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Sent ({totalSentCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('FAILED')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'FAILED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <XCircle className="w-3 h-3" />
            <span>Failed ({totalFailedCount})</span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : emails.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-inner">
              <Send className="w-7 h-7" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-base">No delivery logs found</h4>
            <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
              {search || statusFilter
                ? 'No logs matched your active search and filter criteria. Try clearing filters.'
                : 'Emails processed by the BullMQ worker will appear here with full delivery metadata and inspector diagnostics.'}
            </p>
            {(search || statusFilter) && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Recipient & Identity</th>
                  <th className="py-4 px-6">Subject & Content Preview</th>
                  <th className="py-4 px-6">Execution Timestamp</th>
                  <th className="py-4 px-6">Status & Health</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {emails.map((job) => {
                  const initial = job.recipient ? job.recipient.charAt(0).toUpperCase() : '?';
                  const avatarStyle = getAvatarColor(job.recipient || '');
                  const isSent = job.status === 'SENT';

                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedJob(job)}
                    >
                      {/* Recipient Column */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${avatarStyle} shrink-0`}
                          >
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-[200px]">
                                {job.recipient}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(job.recipient, `rec-${job.id}`, 'Recipient email copied');
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition-all rounded"
                                title="Copy Email"
                              >
                                {copiedId === `rec-${job.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            {(job.cc || job.bcc) && (
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                {job.cc && `CC: ${job.cc}`} {job.bcc && `BCC: ${job.bcc}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Subject Column */}
                      <td className="py-4 px-6 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{job.subject}</div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 font-normal">
                          {job.body.replace(/<[^>]+>/g, '') || 'No body content'}
                        </p>
                      </td>

                      {/* Timestamp Column */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-mono text-slate-800 font-semibold text-xs">
                            {job.sentAt
                              ? format(new Date(job.sentAt), 'MMM dd, yyyy • hh:mm:ss a')
                              : format(new Date(job.scheduledAt), 'MMM dd, yyyy • hh:mm:ss a')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans mt-0.5">
                            {job.sentAt
                              ? formatDistanceToNow(new Date(job.sentAt), { addSuffix: true })
                              : 'Scheduled'}
                          </span>
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={job.status} />
                          {job.attempts > 1 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              {job.attempts} tries
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action Column */}
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedJob(job)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold transition-all border border-slate-200/60 hover:border-indigo-200"
                            title="Inspect Log & Content"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500 font-mono">
              Showing page <strong className="text-slate-800">{pagination.page}</strong> of{' '}
              <strong className="text-slate-800">{pagination.pages}</strong> ({pagination.total} total dispatch logs)
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchData(pagination.page - 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold disabled:opacity-40 transition-colors shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <div className="text-xs font-mono px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold">
                {pagination.page} / {pagination.pages}
              </div>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchData(pagination.page + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold disabled:opacity-40 transition-colors shadow-2xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Deluxe Dispatch Inspector Modal */}
      {selectedJob && (
        <Modal
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          title="Email Dispatch Inspector & Telemetry"
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5">
            {/* Inspector Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <button
                onClick={() => setInspectorTab('preview')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  inspectorTab === 'preview'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Message & Content
              </button>
              <button
                onClick={() => setInspectorTab('meta')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  inspectorTab === 'meta'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Delivery Metadata
              </button>
              <button
                onClick={() => setInspectorTab('json')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  inspectorTab === 'json'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Raw JSON Payload
              </button>
            </div>

            {/* TAB 1: Preview & Message Content */}
            {inspectorTab === 'preview' && (
              <div className="space-y-4">
                {/* Header Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Recipient</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-slate-900 truncate">{selectedJob.recipient}</span>
                      <button
                        onClick={() => handleCopy(selectedJob.recipient, 'modal-rec', 'Recipient copied')}
                        className="p-1 text-slate-400 hover:text-slate-600"
                        title="Copy Recipient"
                      >
                        {copiedId === 'modal-rec' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivery Status</span>
                    <div className="mt-1">
                      <StatusBadge status={selectedJob.status} />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Timestamp</span>
                    <span className="font-mono font-semibold text-slate-800 block mt-0.5 text-[11px]">
                      {selectedJob.sentAt
                        ? format(new Date(selectedJob.sentAt), 'MMM dd, yyyy • hh:mm:ss a')
                        : 'Scheduled'}
                    </span>
                  </div>
                </div>

                {/* Subject Block */}
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Subject</span>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-sm">
                    {selectedJob.subject}
                  </div>
                </div>

                {/* Body Preview with HTML/Plain Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Message Body</span>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        onClick={() => setViewMode('html')}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          viewMode === 'html' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        HTML View
                      </button>
                      <button
                        onClick={() => setViewMode('text')}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          viewMode === 'text' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        Raw Text
                      </button>
                    </div>
                  </div>

                  {viewMode === 'html' ? (
                    <div
                      className="p-5 bg-white border border-slate-200 rounded-xl max-h-64 overflow-y-auto font-sans leading-relaxed text-slate-800 prose prose-sm max-w-none shadow-inner"
                      dangerouslySetInnerHTML={{ __html: selectedJob.body.replace(/\n/g, '<br/>') }}
                    />
                  ) : (
                    <pre className="p-4 bg-slate-900 text-slate-200 font-mono text-xs rounded-xl max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {selectedJob.textBody || selectedJob.body}
                    </pre>
                  )}
                </div>

                {/* Error Banner if Failed */}
                {selectedJob.errorMessage && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="text-xs font-bold block">Delivery Failure Exception:</strong>
                      <p className="font-mono text-xs leading-relaxed text-rose-900">{selectedJob.errorMessage}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Metadata & Diagnostics */}
            {inspectorTab === 'meta' && (
              <div className="space-y-3 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/70">
                    <span className="text-slate-500 font-semibold">Job ID:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedJob.id}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/70">
                    <span className="text-slate-500 font-semibold">Campaign ID:</span>
                    <span className="font-mono font-bold text-indigo-600">{selectedJob.campaignId}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/70">
                    <span className="text-slate-500 font-semibold">BullMQ Job ID:</span>
                    <span className="font-mono text-slate-800">{selectedJob.bullJobId || 'bull_job_' + selectedJob.id}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/70">
                    <span className="text-slate-500 font-semibold">SMTP Message ID:</span>
                    <span className="font-mono text-emerald-700 font-bold">{selectedJob.smtpMessageId || 'Pending Provider Ack'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/70">
                    <span className="text-slate-500 font-semibold">Total Dispatch Attempts:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedJob.attempts}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/70">
                    <span className="text-slate-500 font-semibold">Scheduled Date:</span>
                    <span className="font-mono text-slate-800">{format(new Date(selectedJob.scheduledAt), 'yyyy-MM-dd HH:mm:ss')}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-500 font-semibold">Actual Sent Date:</span>
                    <span className="font-mono text-slate-800">
                      {selectedJob.sentAt ? format(new Date(selectedJob.sentAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Raw JSON Payload */}
            {inspectorTab === 'json' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Normalized JSON Log</span>
                  <button
                    onClick={() => handleCopy(JSON.stringify(selectedJob, null, 2), 'modal-json', 'JSON payload copied')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    {copiedId === 'modal-json' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy JSON</span>
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl max-h-72 overflow-y-auto leading-relaxed border border-slate-800 shadow-inner">
                  {JSON.stringify(selectedJob, null, 2)}
                </pre>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
