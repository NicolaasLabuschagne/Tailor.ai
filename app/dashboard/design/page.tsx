'use client';

import React, { useEffect, useState } from 'react';
import TemplateEditor from '@/components/TemplateEditor';
import PasteTemplateDesigner from '@/components/PasteTemplateDesigner';
import Link from 'next/link';

export default function DesignPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'visual' | 'paste'>('visual');

  useEffect(() => {
    fetch('/api/business-profile/template')
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        if (data.activeTemplateSource === 'pasted') {
          setActiveTab('paste');
        }
        setLoading(false);
      });
  }, []);

  const handleSaveVisual = async (data: { html: string; design: any }) => {
    const res = await fetch('/api/business-profile/template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateHtml: data.html,
        templateJson: JSON.stringify(data.design),
        source: 'unlayer'
      })
    });
    if (res.ok) alert('Visual design saved and set as active!');
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading designer...</div>;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-100">
      <div className="bg-white border-b px-6 pt-3 flex flex-col shadow-sm z-10">
        <div className="flex items-center justify-between mb-3">
          <Link href="/dashboard/settings" className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center">
            &larr; Back to Settings
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Newsletter Template Designer</h1>
          <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-tighter">
            Active: {profile?.activeTemplateSource || 'Generated'}
          </div>
        </div>

        <div className="flex space-x-8">
           <button
             onClick={() => setActiveTab('visual')}
             className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'visual' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
           >
             Visual Designer
           </button>
           <button
             onClick={() => setActiveTab('paste')}
             className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'paste' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
           >
             Paste Template
           </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {activeTab === 'visual' ? (
          <TemplateEditor
            initialDesign={profile?.templateJson}
            onSave={handleSaveVisual}
          />
        ) : (
          <PasteTemplateDesigner
            initialHtml={profile?.pastedTemplateHtml}
            initialMap={profile?.pastedTemplateMap}
          />
        )}
      </div>
    </div>
  );
}
