'use client';

import React, { useState } from 'react';

export default function AIWebsiteGenerator({ onSuccess }: { onSuccess: (slotId: string) => void }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const handleGenerate = async () => {
    if (!url) return;
    setLoading(true);
    setError('');
    setStatus('Analyzing your website...');

    // Progress simulation
    const steps = [
      'Extracting brand colors...',
      'Identifying font pairings...',
      'Resolving brand assets...',
      'AI is designing your custom template...'
    ];
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setStatus(steps[stepIdx]);
        stepIdx++;
      }
    }, 2000);

    try {
      const res = await fetch('/api/templates/generate-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      clearInterval(interval);

      if (res.ok) {
        onSuccess(data.slotId);
        setUrl('');
      } else {
        setError(data.error || 'Failed to generate template.');
      }
    } catch (err) {
      clearInterval(interval);
      setError('A network error occurred.');
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm border-indigo-100 bg-gradient-to-br from-indigo-50/30 to-white">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-xl">✨</span>
        <h2 className="text-lg font-bold text-gray-900">Generate from your website</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">Paste your URL and AI will match your brand colors, fonts and style automatically.</p>

      <div className="flex space-x-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourwebsite.com"
          className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          disabled={loading}
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !url}
          className="bg-indigo-600 text-white px-6 py-2 rounded-md text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {loading && (
        <div className="mt-4 flex items-center space-x-3 text-indigo-600 animate-pulse">
           <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           <span className="text-xs font-medium tracking-wide uppercase">{status}</span>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs rounded-md border border-red-100 font-medium">
          {error}
        </div>
      )}
    </div>
  );
}
