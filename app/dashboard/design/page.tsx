'use client';

import React, { useEffect, useState } from 'react';
import TemplateEditor from '@/components/TemplateEditor';
import PasteTemplateDesigner from '@/components/PasteTemplateDesigner';
import AIWebsiteGenerator from '@/components/AIWebsiteGenerator';
import MyTemplates from '@/components/MyTemplates';
import Link from 'next/link';

export default function DesignPage() {
  const [profile, setProfile] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'visual' | 'paste'>('visual');
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const fetchData = async () => {
    const [profileRes, slotsRes] = await Promise.all([
      fetch('/api/business-profile'),
      fetch('/api/templates')
    ]);
    const profileData = await profileRes.json();
    const slotsData = await slotsRes.json();

    setProfile(profileData);

    const fullSlots = [];
    for (let i = 1; i <= 5; i++) {
      const existing = slotsData.find((s: any) => s.slotNumber === i);
      if (existing) fullSlots.push(existing);
      else fullSlots.push({ slotNumber: i, isEmpty: true, name: 'Empty Slot ' + i });
    }
    setSlots(fullSlots);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveVisual = async (data: { html: string; design: any }) => {
    const targetSlot = editingTemplate?.slotNumber || slots.find(s => s.isEmpty)?.slotNumber || 1;

    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateHtml: data.html,
        templateJson: JSON.stringify(data.design),
        source: 'UNLAYER',
        slotNumber: targetSlot,
        name: editingTemplate?.name || 'Visual Template'
      })
    });

    if (res.ok) {
       alert('Template saved!');
       setEditingTemplate(null);
       fetchData();
    }
  };

  const handleSavePasted = async (data: { html: string; contentMap: any }) => {
    const targetSlot = editingTemplate?.slotNumber || slots.find(s => s.isEmpty)?.slotNumber || 1;

    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateHtml: data.html,
        contentMap: JSON.stringify(data.contentMap),
        source: 'PASTED',
        slotNumber: targetSlot,
        name: editingTemplate?.name || 'Pasted Template'
      })
    });

    if (res.ok) {
       alert('Template saved!');
       setEditingTemplate(null);
       fetchData();
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading designer...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 pb-20">
      <div className="bg-white border-b px-6 pt-3 flex flex-col shadow-sm z-10 sticky top-0">
        <div className="flex items-center justify-between mb-3">
          <Link href="/dashboard/settings" className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center">
            &larr; Back to Settings
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Newsletter Template Designer</h1>
          <div className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full uppercase tracking-tighter">
            50% More Engagement with Custom Templates
          </div>
        </div>

        <div className="flex space-x-8">
           <button
             onClick={() => { setActiveTab('visual'); setEditingTemplate(null); }}
             className={"pb-3 text-sm font-medium transition-colors " + (activeTab === 'visual' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700')}
           >
             Visual Designer
           </button>
           <button
             onClick={() => { setActiveTab('paste'); setEditingTemplate(null); }}
             className={"pb-3 text-sm font-medium transition-colors " + (activeTab === 'paste' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700')}
           >
             Paste HTML
           </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-6 py-8 space-y-12">
        <AIWebsiteGenerator onSuccess={() => fetchData()} />

        <MyTemplates
          slots={slots}
          onEdit={(slot) => {
            setEditingTemplate(slot);
            setActiveTab(slot.source === 'PASTED' || slot.source === 'AI_GENERATED' ? 'paste' : 'visual');
            window.scrollTo({ top: 400, behavior: 'smooth' });
          }}
          onRefresh={fetchData}
        />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
             <h2 className="text-sm font-bold text-gray-700">
               {editingTemplate ? ("Editing: " + editingTemplate.name) : "Create New Template"}
             </h2>
             {editingTemplate && (
               <button onClick={() => setEditingTemplate(null)} className="text-xs text-red-600 font-bold uppercase">Cancel Edit</button>
             )}
          </div>
          <div className="h-[700px] relative">
            {activeTab === 'visual' ? (
              <TemplateEditor
                initialDesign={editingTemplate?.templateJson}
                onSave={handleSaveVisual}
              />
            ) : (
              <PasteTemplateDesigner
                initialHtml={editingTemplate?.templateHtml}
                initialMap={editingTemplate?.contentMap}
                onSave={handleSavePasted}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
