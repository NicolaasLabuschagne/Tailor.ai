'use client';

import React from 'react';

interface NewsletterJob {
  id: string;
  status: string;
  subject: string | null;
  htmlContent: string | null;
  previewText: string | null;
  editNote: string | null;
}

interface NewsletterPreviewProps {
  job: NewsletterJob;
  onDeleted?: () => void;
  onStatusUpdate?: (status: string) => void;
}

export default function NewsletterPreview({ job, onDeleted, onStatusUpdate }: NewsletterPreviewProps) {
  const [view, setView] = React.useState<'desktop' | 'mobile'>('desktop');
  const [editNote, setEditNote] = React.useState('');
  const [isRegenerating, setIsRegenerating] = React.useState(false);

  const handleApprove = async () => {
    await fetch(`/api/newsletters/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id }),
    });
    if (onStatusUpdate) onStatusUpdate('APPROVED');
    else window.location.reload();
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
    if (!confirm('Are you sure you want to delete this newsletter?')) return;
    const res = await fetch(`/api/newsletters/${job.id}`, { method: 'DELETE' });
    if (res.ok) {
       if (onDeleted) onDeleted();
       else window.location.reload();
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
              className={`px-3 py-1 text-xs rounded ${view === 'desktop' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
            >
              Desktop
            </button>
            <button
              onClick={() => setView('mobile')}
              className={`px-3 py-1 text-xs rounded ${view === 'mobile' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
            >
              Mobile
            </button>
          </div>
        </div>

        <div className="flex space-x-2">
           <button onClick={handleDelete} className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded">
             Delete
           </button>
           {job.status === 'AWAITING_APPROVAL' && (
             <>
               <button onClick={handleReject} className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded">
                 Deny
               </button>
               <button onClick={handleApprove} className="px-4 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700">
                 Approve & Schedule
               </button>
             </>
           )}
           {job.status === 'REJECTED' && (
              <button
                onClick={() => handleStatusUpdateAction('AWAITING_APPROVAL')}
                className="px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded"
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
            <iframe
              srcDoc={job.htmlContent}
              title="Newsletter Preview"
              className="w-full h-full border-none"
              style={{ minHeight: '800px' }}
              sandbox="allow-scripts" // Sandbox to prevent top level navigation but allow styles/scripts
            />
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
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
        </div>
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
