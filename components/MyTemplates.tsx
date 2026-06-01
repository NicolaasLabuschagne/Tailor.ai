'use client';

import React from 'react';
import TemplateSlotCard from './TemplateSlotCard';

interface Template {
  id: string;
  name: string;
  source: string;
  isActive: boolean;
  thumbnail: string | null;
  isEmpty?: boolean;
  slotNumber: number;
}

interface Props {
  slots: Template[];
  onEdit: (slot: Template) => void;
  onRefresh: () => void;
}

export default function MyTemplates({ slots, onEdit, onRefresh }: Props) {
  const handleActivate = async (id: string) => {
    await fetch("/api/templates/" + id + "/activate", { method: 'POST' });
    onRefresh();
  };

  const handleRename = async (id: string, name: string) => {
    await fetch("/api/templates/" + id + "/rename", {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Clear this slot?')) return;
    const res = await fetch("/api/templates/" + id, { method: 'DELETE' });
    if (res.ok) onRefresh();
    else {
      const err = await res.json();
      alert(err.error || 'Failed to delete');
    }
  };

  const handleDuplicate = async (id: string) => {
    const res = await fetch("/api/templates/" + id + "/duplicate", { method: 'POST' });
    if (res.ok) onRefresh();
    else {
      const err = await res.json();
      alert(err.error || 'Failed to duplicate');
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 text-gray-900">My Templates (5 Slots)</h3>
      <div className="flex space-x-6 overflow-x-auto pb-2">
        {slots.map((slot, i) => (
          <TemplateSlotCard
            key={slot.id || ("empty-" + i)}
            slot={slot}
            onEdit={onEdit}
            onActivate={handleActivate}
            onRename={handleRename}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        ))}
      </div>
    </div>
  );
}
