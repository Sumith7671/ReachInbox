import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { LeadParseSummary, AttachmentItem } from '../types';
import {
  Upload,
  CheckCircle2,
  Clock,
  Send,
  Calculator,
  Eye,
  FileText,
  Zap,
  Sparkles,
  Calendar,
  Image as ImageIcon,
  Music,
  Paperclip,
  X,
  Plus,
  Bold,
  Italic,
  Underline,
  List,
  Link,
  Volume2,
  File,
} from 'lucide-react';
import { format } from 'date-fns';

const getLocalISOString = (date: Date = new Date()) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

export const ComposeCampaign: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Live Real-Time Clock Ticker (Updates every 1000ms)
  const [realtimeClock, setRealtimeClock] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setRealtimeClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // CC / BCC Field Toggles
  const [showCcBcc, setShowCcBcc] = useState<boolean>(false);
  const [cc, setCc] = useState<string>('');
  const [bcc, setBcc] = useState<string>('');

  const [subject, setSubject] = useState<string>('Quick inquiry regarding outreach project');
  const [body, setBody] = useState<string>(
    'Hello,\n\nI hope this email finds you well. I am reaching out to share details regarding our outreach communication platform.\n\nPlease let me know if you would be open to a brief discussion.\n\nBest regards,\nSumith Reddy'
  );

  // Attachments State (Images, Audio, Documents)
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState<boolean>(false);

  // Schedule settings with live local wall-clock initialization
  const [startTime, setStartTime] = useState<string>(getLocalISOString());
  const [delayBetweenEmails, setDelayBetweenEmails] = useState<number>(2000); // 2000ms delay for high inbox deliverability
  const [hourlyLimit, setHourlyLimit] = useState<number>(500);

  // Manual Recipients Input
  const [manualRecipientsText, setManualRecipientsText] = useState<string>('');

  // File Upload Leads State
  const [fileLeadsSummary, setFileLeadsSummary] = useState<LeadParseSummary | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [parsing, setParsing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Parse and extract all valid email addresses from manual text + uploaded file
  const combinedRecipients = useMemo(() => {
    const singleEmailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const tokens = manualRecipientsText.split(/[\r\n,;\t\s]+/);

    const uniqueSet = new Set<string>();

    for (const token of tokens) {
      const match = token.trim().toLowerCase().match(singleEmailRegex);
      if (match) {
        uniqueSet.add(match[0]);
      }
    }

    if (fileLeadsSummary?.validEmails) {
      fileLeadsSummary.validEmails.forEach((e) => uniqueSet.add(e.toLowerCase().trim()));
    }

    return Array.from(uniqueSet);
  }, [manualRecipientsText, fileLeadsSummary]);

  // Lead File Handler
  const handleFileUpload = async (file: File) => {
    try {
      setParsing(true);
      const data = await apiService.parseLeadsFile(file);
      setFileLeadsSummary(data.summary);

      if (data.summary.validEmails && data.summary.validEmails.length > 0) {
        setManualRecipientsText((prev) => {
          if (!prev.trim()) return data.summary.validEmails.join('\n');
          return `${prev.trim()}\n${data.summary.validEmails.join('\n')}`;
        });
      }

      showToast(
        'File parsed successfully',
        `Extracted ${data.summary.validEmailsCount} valid email addresses from file.`,
        'success'
      );
    } catch (err: any) {
      showToast('Lead parsing failed', err.response?.data?.message || 'Invalid file format', 'error');
    } finally {
      setParsing(false);
    }
  };

  // Attachment Upload Handler (Images & Audio)
  const handleAttachmentUpload = async (file: File) => {
    const maxSizeBytes = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSizeBytes) {
      return showToast('File too large', 'Attachment size exceeds 25MB limit.', 'error');
    }

    try {
      setUploadingAttachment(true);
      const data = await apiService.uploadAttachment(file);
      const localPreviewUrl = URL.createObjectURL(file);

      const newItem: AttachmentItem = {
        filename: data.attachment.filename,
        filepath: data.attachment.filepath,
        mimetype: data.attachment.mimetype,
        size: data.attachment.size,
        previewUrl: localPreviewUrl,
      };

      setAttachments((prev) => [...prev, newItem]);
      showToast('Attachment Uploaded', `Successfully attached ${file.name}`, 'success');
    } catch (err: any) {
      showToast('Attachment error', err.response?.data?.message || 'Failed to upload attachment', 'error');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const calculatedEstCompletion = useMemo(() => {
    const count = combinedRecipients.length;
    if (count === 0) return 'N/A';

    const parsedMs = Date.parse(startTime);
    const startMs = !isNaN(parsedMs) ? parsedMs : Date.now();

    const delayTimeMs = (count - 1) * Math.max(0, delayBetweenEmails);
    const limit = Math.max(1, hourlyLimit);
    const extraHoursNeeded = Math.floor((count - 1) / limit);

    const totalDurationMs = delayTimeMs + extraHoursNeeded * 3600 * 1000;
    const completionDate = new Date(startMs + totalDurationMs);

    return format(completionDate, 'MMM dd, yyyy • hh:mm:ss a');
  }, [combinedRecipients, startTime, delayBetweenEmails, hourlyLimit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      return showToast('Subject required', 'Please enter a campaign subject.', 'warning');
    }

    if (!body.trim()) {
      return showToast('Email body required', 'Please enter email body content.', 'warning');
    }

    if (combinedRecipients.length === 0) {
      return showToast('Recipients required', 'Enter manual email addresses or upload a lead file.', 'warning');
    }

    try {
      setSubmitting(true);
      const parsedMs = Date.parse(startTime);

      await apiService.createCampaign({
        subject,
        body,
        cc: showCcBcc ? cc : undefined,
        bcc: showCcBcc ? bcc : undefined,
        startTime: !isNaN(parsedMs) ? new Date(parsedMs).toISOString() : new Date().toISOString(),
        delayBetweenEmails,
        hourlyLimit,
        recipients: combinedRecipients,
        attachments: attachments.map((att) => ({
          filename: att.filename,
          filepath: att.filepath,
          mimetype: att.mimetype,
          size: att.size,
        })),
      });

      showToast(
        'Campaign Scheduled!',
        `Successfully scheduled ${combinedRecipients.length} email jobs for outreach delivery.`,
        'success'
      );

      navigate('/scheduled');
    } catch (err: any) {
      showToast('Scheduling failed', err.response?.data?.message || err.message || 'Failed to schedule campaign', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Title Header with Live Real-Time Clock Ticker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Option 3 • Resend Minimalist Crisp Light</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create & Schedule Outreach</h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure lead lists, delivery rate limits, and media attachments with a clean light interface.
          </p>
        </div>

        {/* Live Real-Time Digital Clock */}
        <div className="bg-white border border-slate-200/90 text-slate-900 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-sm shrink-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live System Time</div>
            <div className="text-xs font-mono font-extrabold text-blue-700">
              {format(realtimeClock, 'EEEE, dd MMM yyyy • hh:mm:ss a')}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Controls Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Gmail-Style Email Composer Card */}
          <div className="resend-card p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Email Content Editor</span>
              </span>
              <button
                type="button"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline"
              >
                {showCcBcc ? '- Hide CC / BCC' : '+ Add CC / BCC'}
              </button>
            </div>

            {/* CC / BCC Inputs */}
            {showCcBcc && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">CC Email Addresses</label>
                  <input
                    type="text"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="cc1@domain.com, cc2@domain.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">BCC Email Addresses</label>
                  <input
                    type="text"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="bcc1@domain.com, bcc2@domain.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Quick inquiry regarding outreach project"
                required
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-semibold text-slate-900 transition-all"
              />
            </div>

            {/* Rich Formatting Bar */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden focus-within:border-blue-500 transition-all">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setBody((prev) => prev + ' **bold text**')}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 font-bold text-xs"
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setBody((prev) => prev + ' *italic text*')}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 font-bold text-xs"
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setBody((prev) => prev + ' <u>underline</u>')}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 font-bold text-xs"
                    title="Underline"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <div className="h-4 w-px bg-slate-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => setBody((prev) => prev + '\n- Item 1\n- Item 2')}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 text-xs"
                    title="List"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Plain Text + HTML Sync</span>
              </div>

              <textarea
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email body here..."
                required
                className="w-full p-4 text-sm focus:outline-none font-medium text-slate-900 leading-relaxed bg-white"
              />
            </div>
          </div>

          {/* Media & Audio Attachments Dropzone */}
          <div className="resend-card p-7 space-y-5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-blue-600" />
                <span>Media & Audio Attachments</span>
              </label>
              <span className="text-xs text-blue-700 font-extrabold bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                {attachments.length} Attached
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Image Upload Box */}
              <div className="border-2 border-dashed border-blue-200 rounded-2xl p-4 text-center bg-blue-50/30 hover:bg-blue-50/60 transition-all">
                <input
                  type="file"
                  accept="image/*"
                  id="image-attach-input"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleAttachmentUpload(e.target.files[0])}
                />
                <label htmlFor="image-attach-input" className="cursor-pointer space-y-2 block">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                    <ImageIcon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Attach Images</p>
                    <p className="text-[10px] text-slate-400">PNG, JPG, WEBP, GIF (Max 25MB)</p>
                  </div>
                </label>
              </div>

              {/* Audio Upload Box */}
              <div className="border-2 border-dashed border-purple-200 rounded-2xl p-4 text-center bg-purple-50/30 hover:bg-purple-50/60 transition-all">
                <input
                  type="file"
                  accept="audio/*"
                  id="audio-attach-input"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleAttachmentUpload(e.target.files[0])}
                />
                <label htmlFor="audio-attach-input" className="cursor-pointer space-y-2 block">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
                    <Music className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Attach Audio Voice Notes</p>
                    <p className="text-[10px] text-slate-400">MP3, WAV, M4A, OGG (Max 25MB)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Attached Files Gallery Cards */}
            {attachments.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-[11px] font-bold text-slate-700">Campaign Attachment Cards:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {att.mimetype.startsWith('image/') ? (
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 overflow-hidden flex items-center justify-center shrink-0">
                            {att.previewUrl ? (
                              <img src={att.previewUrl} alt="preview" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-blue-400" />
                            )}
                          </div>
                        ) : att.mimetype.startsWith('audio/') ? (
                          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                            <Volume2 className="w-5 h-5 animate-pulse" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                            <File className="w-5 h-5" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-white">{att.filename}</p>
                          <p className="text-[10px] text-slate-400">
                            {(att.size / 1024).toFixed(1)} KB • {att.mimetype.split('/')[1]?.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recipients Section: Manual Input + File Upload */}
          <div className="resend-card p-7 space-y-5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Target Recipients
              </label>
              <span className="text-xs text-blue-700 font-extrabold bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 shadow-2xs">
                {combinedRecipients.length} Unique Leads Ready
              </span>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">
                Paste Email Addresses (Supports 300+ emails separated by new lines or commas)
              </label>
              <textarea
                rows={5}
                value={manualRecipientsText}
                onChange={(e) => setManualRecipientsText(e.target.value)}
                placeholder="Enter email addresses (e.g. email1@domain.com, email2@domain.com)..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 transition-all bg-white"
              />

              {combinedRecipients.length > 0 && (
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span>Parsed Recipient List ({combinedRecipients.length} Email Jobs)</span>
                    <span className="text-blue-600 font-semibold">1 Recipient = 1 Email Job</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {combinedRecipients.slice(0, 50).map((email, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-blue-700 font-mono text-[11px] font-semibold shadow-2xs"
                      >
                        {email}
                      </span>
                    ))}
                    {combinedRecipients.length > 50 && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 font-bold text-[11px]">
                        + {combinedRecipients.length - 50} more recipients
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Lead Drag & Drop Box */}
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">
                Or Upload Lead File (.CSV or .TXT)
              </label>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50/60 scale-[1.01]'
                    : 'border-slate-200 hover:border-blue-300 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  accept=".csv,.txt"
                  id="file-upload"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
                <label htmlFor="file-upload" className="cursor-pointer space-y-2 block">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {parsing ? 'Parsing lead file...' : 'Drag & drop CSV or TXT file with 300+ emails'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {fileLeadsSummary && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Extracted {fileLeadsSummary.validEmailsCount} leads from file</span>
              </div>
            )}
          </div>

          {/* Delivery Schedule & Timing */}
          <div className="resend-card p-7 space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Delivery Timing & Constraints</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Start Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500 bg-white"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStartTime(getLocalISOString());
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Sync Real-Time Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartTime(getLocalISOString(new Date(Date.now() + 5 * 60000)))}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px]"
                  >
                    +5 Mins
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Delay Between Emails (ms)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={delayBetweenEmails}
                  onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500 bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">2000ms delay protects Primary Inbox delivery</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Hourly Delivery Limit</label>
              <input
                type="number"
                min={1}
                max={5000}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 500)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Live Email & Schedule Summary Right Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Rendered Email Preview */}
          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl text-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                <Eye className="w-4 h-4" />
                <span>Live Email Render Preview</span>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                HTML Rendered
              </span>
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="text-xs text-slate-400 space-y-1.5">
                <div>
                  <span className="text-slate-500 font-mono">From:</span> Sumith Reddy &lt;sumithreddy509@gmail.com&gt;
                </div>
                <div>
                  <span className="text-slate-500 font-mono">To:</span>{' '}
                  <span className="text-blue-300 font-semibold">
                    {combinedRecipients.length > 0 ? (
                      <>
                        {combinedRecipients[0]}
                        {combinedRecipients.length > 1 && (
                          <span className="text-emerald-400 font-bold text-[11px] ml-2 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            + {combinedRecipients.length - 1} other individual email jobs
                          </span>
                        )}
                      </>
                    ) : (
                      'recipient@example.com'
                    )}
                  </span>
                </div>
                {showCcBcc && (cc || bcc) && (
                  <div className="text-[11px] text-slate-400">
                    {cc && <div><span className="text-slate-500 font-mono">Cc:</span> {cc}</div>}
                    {bcc && <div><span className="text-slate-500 font-mono">Bcc:</span> {bcc}</div>}
                  </div>
                )}
                <div className="text-[10px] text-emerald-400 font-mono pt-0.5 flex items-center gap-1">
                  <span>✓ Each recipient will receive an individual email job & SMTP dispatch</span>
                </div>
                <div>
                  <span className="text-slate-500 font-mono">Subject:</span>{' '}
                  <span className="text-white font-bold">{subject || 'No Subject'}</span>
                </div>
              </div>

              {/* Live Rendered Body */}
              <div className="bg-white text-slate-900 rounded-xl p-4 text-xs leading-relaxed font-sans shadow-inner space-y-3">
                {body ? (
                  <div dangerouslySetInnerHTML={{ __html: body.replace(/\n/g, '<br/>') }} />
                ) : (
                  <span className="text-slate-400 italic">Email message content preview will display here...</span>
                )}

                {/* Render Audio Player & Image Thumbnails Preview in Email Body */}
                {attachments.length > 0 && (
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Attachments:</p>

                    {attachments.map((att, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                          <span>📎 {att.filename}</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {(att.size / 1024).toFixed(1)} KB
                          </span>
                        </div>

                        {/* Interactive HTML5 Audio Player Preview */}
                        {att.mimetype.startsWith('audio/') && att.previewUrl && (
                          <div className="pt-1">
                            <audio controls src={att.previewUrl} className="w-full h-8 text-xs" />
                          </div>
                        )}

                        {/* Image Thumbnail Preview */}
                        {att.mimetype.startsWith('image/') && att.previewUrl && (
                          <div className="w-full h-36 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                            <img src={att.previewUrl} alt="preview" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Schedule Calculation Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-6 rounded-3xl border border-blue-500/20 text-white space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
              <Calculator className="w-4 h-4 text-blue-400" />
              <span>Bulk Delivery Calculation</span>
            </div>

            <div className="space-y-3 text-xs divide-y divide-slate-800/80">
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400">Total Target Recipients</span>
                <span className="font-bold text-emerald-400 text-sm">{combinedRecipients.length} Email Jobs</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400">Campaign Attachments</span>
                <span className="font-bold text-purple-300">{attachments.length} Attached Files</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400">Delay Between Emails</span>
                <span className="font-bold text-blue-300">{delayBetweenEmails} ms</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400">Hourly Rate Limit</span>
                <span className="font-bold text-purple-300">{hourlyLimit} emails / hr</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400">Est. Completion</span>
                <span className="font-mono text-blue-200 text-[11px]">{calculatedEstCompletion}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || combinedRecipients.length === 0}
              className="w-full py-4 rounded-2xl resend-button text-white font-extrabold text-sm shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${submitting ? 'animate-spin' : ''}`} />
              <span>{submitting ? 'Scheduling Bulk Outreach...' : `Schedule All ${combinedRecipients.length} Emails`}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
