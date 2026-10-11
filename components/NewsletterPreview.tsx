'use client';

import React from 'react';
import EmailFrame from './EmailFrame';
import LayoutPickerModal from './LayoutPickerModal';
import { useDialogs } from './ui/Dialogs';

interface NewsletterJob {
  id: string;
  status: string;
  subject: string | null;
  htmlContent: string | null;
  previewText: string | null;
  editNote: string | null;
  contentJson?: string | null;
  layoutId?: string | null;
}

interface NewsletterPreviewProps {
  job: NewsletterJob;
  onDeleted?: () => void;
  onStatusUpdate?: (status: string) => void;
  onJobUpdate?: (job: any) => void;
}

export default function NewsletterPreview({ job, onDeleted, onStatusUpdate, onJobUpdate }: NewsletterPreviewProps) {
  const { confirm, notify } = useDialogs();
  const [view, setView] = React.useState<'desktop' | 'mobile'>('desktop');
  const [editNote, setEditNote] = React.useState('');
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [scheduledAt, setScheduledAt] = React.useState('');
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const canChangeLayout = !!job.contentJson && !['SENT', 'PROCESSING'].includes(job.status);

  const handleApprove = async () => {
    if (!scheduledAt) {
       notify({ tone: 'error', title: 'Pick a send time', message: 'Choose when this newsletter should go out, then approve it.' });
       return;
    }
    const res = await fetch(`/api/newsletters/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, scheduledAt }),
    });
    if (res.ok) {
       notify({
         tone: 'success',
         title: 'Newsletter scheduled',
         message: `It will be sent ${new Date(scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}.`,
       });
       if (onStatusUpdate) onStatusUpdate('APPROVED');
       else window.location.reload();
    } else {
       const err = await res.json().catch(() => ({}));
       notify({ tone: 'error', title: "Couldn't schedule newsletter", message: err.error || 'Please try again.' });
    }
  };

  const handleReject = async () => {
    const res = await fetch(`/api/newsletters/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REJECTED' }),
    });
    if (res.ok) {
       if (onStatusUpdate) onStatusUpdate('REJECTED');
       else window.location.reload();
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete this newsletter?',
      message: `"${job.subject || 'Untitled newsletter'}" will be permanently removed. This can't be undone.`,
      confirmLabel: 'Delete newsletter',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await fetch(`/api/newsletters/${job.id}`, { method: 'DELETE' });
    if (res.ok) {
       notify({ tone: 'success', message: 'Newsletter deleted.' });
       if (onDeleted) onDeleted();
       else window.location.reload();
    } else {
       notify({ tone: 'error', title: "Couldn't delete newsletter", message: 'Please try again.' });
    }
  };

  const handleRequestEdit = async () => {
    setIsRegenerating(true);
    await fetch(`/api/newsletters/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, editNote }),
    });
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-gray-50">
      <div className="flex items-center justify-between p-2 bg-white border-b">
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setView('desktop')}
              className={`px-3 py-1 text-xs rounded ${view === 'desktop' ? 'bg-brand-600 text-white' : 'bg-gray-200'}`}
            >
              Desktop
            </button>
            <button
              onClick={() => setView('mobile')}
              className={`px-3 py-1 text-xs rounded ${view === 'mobile' ? 'bg-brand-600 text-white' : 'bg-gray-200'}`}
            >
              Mobile
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
           {job.htmlContent && !['SENT', 'PROCESSING'].includes(job.status) && (
             <button
               onClick={() => setPickerOpen(true)}
               disabled={!canChangeLayout}
               title={canChangeLayout ? 'Pick a different layout for this newsletter' : 'Regenerate this newsletter to enable layouts'}
               className="px-3 py-1 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded border border-brand-100 disabled:opacity-50"
             >
               Change layout
             </button>
           )}
           <button onClick={handleDelete} className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded">
             Delete
           </button>
           {job.status === 'AWAITING_APPROVAL' && (
             <div className="flex flex-col sm:flex-row items-center space-x-0 sm:space-x-2 bg-gray-50 p-2 rounded border">
               <div className="flex items-center space-x-1 mb-2 sm:mb-0">
                  <label className="text-[9px] uppercase font-bold text-gray-400">Schedule:</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="text-[11px] border border-gray-300 rounded px-1 py-0.5 bg-white focus:ring-brand-500 focus:border-brand-500"
                  />
               </div>
               <div className="flex items-center space-x-2">
                  <button onClick={handleReject} className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-white rounded shadow-sm border">
                    Deny
                  </button>
                  <button onClick={handleApprove} className="px-4 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 shadow-sm transition-colors">
                    Approve & Schedule
                  </button>
               </div>
             </div>
           )}
           {job.status === 'REJECTED' && (
              <button
                onClick={() => handleStatusUpdateAction('AWAITING_APPROVAL')}
                className="px-3 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded"
              >
                Restore to Draft
              </button>
           )}
        </div>
      </div>

      <div className="flex-1 flex justify-center p-4 overflow-auto">
        <div
          className={`bg-white shadow-lg transition-all duration-300 ${view === 'desktop' ? 'w-full max-w-4xl' : 'w-[375px]'}`}
          style={{ height: 'fit-content', minHeight: '100%' }}
        >
          {job.htmlContent ? (
            <EmailFrame html={job.htmlContent} title="Newsletter Preview" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 italic">
              Generation in progress...
            </div>
          )}
        </div>
      </div>

      {(job.status === 'AWAITING_APPROVAL' || job.status === 'REJECTED') && (
        <div className="p-4 bg-white border-t">
          <label className="block text-sm font-medium text-gray-700 mb-2">Regenerate with Edits</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="e.g. Make the tone more professional..."
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <button
              onClick={handleRequestEdit}
              disabled={!editNote || isRegenerating}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded hover:bg-brand-700 disabled:opacity-50"
            >
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
        </div>
      )}

      {pickerOpen && (
        <LayoutPickerModal
          jobId={job.id}
          currentLayoutId={job.layoutId ?? null}
          onClose={() => setPickerOpen(false)}
          onApplied={(updated) => {
            setPickerOpen(false);
            notify({ tone: 'success', message: 'Layout updated. Your content stayed the same.' });
            if (onJobUpdate) onJobUpdate(updated);
            else window.location.reload();
          }}
        />
      )}
    </div>
  );

  async function handleStatusUpdateAction(status: string) {
    const res = await fetch(`/api/newsletters/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
       if (onStatusUpdate) onStatusUpdate(status);
       else window.location.reload();
    }
  }
}
