'use client';

import React, { useState } from 'react';
import NewsletterPreview from './NewsletterPreview';
import StatusBadge from './StatusBadge';

interface NewsletterJob {
  id: string;
  status: any;
  subject: string | null;
  htmlContent: string | null;
  previewText: string | null;
  editNote: string | null;
  createdAt: Date | string;
}

interface Props {
  initialJobs: NewsletterJob[];
}

export default function NewsletterDashboard({ initialJobs }: Props) {
  const [jobs, setJobs] = useState(initialJobs);
  const [selectedJob, setSelectedJob] = useState<NewsletterJob | null>(initialJobs[0] || null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this newsletter?')) return;

    const res = await fetch(`/api/newsletters/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const updated = jobs.filter(j => j.id !== id);
      setJobs(updated);
      if (selectedJob?.id === id) {
        setSelectedJob(updated[0] || null);
      }
    }
  };

  const handleStatusUpdate = async (id: string, status: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await fetch(`/api/newsletters/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      const updatedJob = await res.json();
      const updatedJobs = jobs.map(j => j.id === id ? updatedJob : j);
      setJobs(updatedJobs);
      if (selectedJob?.id === id) {
        setSelectedJob(updatedJob);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[800px]">
        {jobs.map((job) => (
          <div
            key={job.id}
            onClick={() => setSelectedJob(job)}
            className={`bg-white shadow rounded-lg p-4 border transition-colors cursor-pointer ${selectedJob?.id === job.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-indigo-300'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <StatusBadge status={job.status} />
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">{new Date(job.createdAt).toLocaleDateString()}</span>
                <button
                  onClick={(e) => handleDelete(job.id, e)}
                  className="text-gray-400 hover:text-red-500"
                  title="Delete"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-900 truncate">{job.subject || 'Untitled Newsletter'}</h3>
            <p className="text-xs text-gray-500 mt-1 truncate">{job.previewText || 'No preview available'}</p>

            {job.status === 'AWAITING_APPROVAL' && (
               <div className="mt-3 flex space-x-2">
                  <button
                    onClick={(e) => handleStatusUpdate(job.id, 'REJECTED', e)}
                    className="text-[10px] px-2 py-1 bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100"
                  >
                    Deny
                  </button>
               </div>
            )}
          </div>
        ))}
        {jobs.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500 text-sm">No newsletters yet. Click generate to start.</p>
          </div>
        )}
      </div>

      <div className="lg:col-span-2">
        {selectedJob ? (
          <NewsletterPreview job={selectedJob} onDeleted={() => {
             const updated = jobs.filter(j => j.id !== selectedJob.id);
             setJobs(updated);
             setSelectedJob(updated[0] || null);
          }} onStatusUpdate={(status) => {
             const updatedJobs = jobs.map(j => j.id === selectedJob.id ? { ...selectedJob, status } : j);
             setJobs(updatedJobs);
             setSelectedJob({ ...selectedJob, status });
          }} />
        ) : (
           <div className="bg-gray-50 rounded-lg h-[600px] flex items-center justify-center text-gray-400 border border-gray-200">
             Select a newsletter to preview
           </div>
        )}
      </div>
    </div>
  );
}
