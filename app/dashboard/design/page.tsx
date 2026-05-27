'use client';

import React, { useEffect, useState } from 'react';
import TemplateEditor from '@/components/TemplateEditor';
import Link from 'next/link';

export default function DesignPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importHtml, setImportHtml] = useState('');

  useEffect(() => {
    fetch('/api/business-profile/template')
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      });
  }, []);

  const handleSave = async (data: { html: string; design: any }) => {
    const res = await fetch('/api/business-profile/template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateHtml: data.html,
        templateJson: JSON.stringify(data.design)
      })
    });
    if (res.ok) alert('Design saved successfully!');
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading designer...</div>;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-100">
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm z-10">
        <Link href="/dashboard/settings" className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center">
          &larr; Back to Settings
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Newsletter Template Designer</h1>
        <div className="flex items-center space-x-4">
           <button onClick={() => window.location.reload()} className="text-gray-400 hover:text-gray-600 text-xs uppercase tracking-widest font-bold">
             Reset Design
           </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <TemplateEditor
          initialDesign={profile?.templateJson}
          onSave={handleSave}
        />
      </div>

      <div className="bg-white border-t transition-all duration-300">
        <button
          onClick={() => setShowImport(!showImport)}
          className="w-full py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center justify-center font-medium"
        >
          {showImport ? 'Close Import Panel ▴' : 'Import from Canva or custom HTML ▾'}
        </button>

        {showImport && (
          <div className="p-6 bg-gray-50">
            <div className="max-w-4xl mx-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">Paste your HTML here</label>
              <textarea
                value={importHtml}
                onChange={(e) => setImportHtml(e.target.value)}
                rows={5}
                className="w-full border rounded-md p-3 text-xs font-mono"
                placeholder="<html><body>...</body></html>"
              />
              <p className="text-[10px] text-gray-400 mt-2">Export your design from Canva as HTML, paste it here. Imported designs may need manual adjustments. We recommend using the editor's built-in blocks for the best email compatibility.</p>
              <div className="mt-4 flex justify-end">
                <button
                  disabled
                  className="bg-gray-200 text-gray-500 px-4 py-2 rounded-md text-sm cursor-not-allowed"
                >
                  Import HTML (Coming Soon)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
