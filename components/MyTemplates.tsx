'use client';

import React, { useEffect, useState } from 'react';
import TemplateSlotCard from './TemplateSlotCard';
import TemplatePreviewModal from './TemplatePreviewModal';
import { useDialogs } from './ui/Dialogs';

interface Template {
  id: string;
  name: string;
  source: string;
  isActive: boolean;
  thumbnail: string | null;
  isEmpty?: boolean;
  slotNumber: number;
  templateHtml?: string | null;
  contentMap?: string | null;
}

interface Props {
  slots: Template[];
  onEdit: (slot: Template) => void;
  onRefresh: () => void;
  businessName?: string;
  // Open this template's preview as soon as it appears (e.g. right after AI generation)
  autoPreviewId?: string | null;
  onAutoPreviewShown?: () => void;
}

export default function MyTemplates({ slots, onEdit, onRefresh, businessName, autoPreviewId, onAutoPreviewShown }: Props) {
  const { confirm, notify } = useDialogs();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewing = slots.find(s => s.id === previewId && !s.isEmpty) || null;

  useEffect(() => {
    if (autoPreviewId && slots.some(s => s.id === autoPreviewId)) {
      setPreviewId(autoPreviewId);
      onAutoPreviewShown?.();
    }
  }, [autoPreviewId, slots, onAutoPreviewShown]);

  const handleActivate = async (id: string) => {
    const res = await fetch("/api/templates/" + id + "/activate", { method: 'POST' });
    onRefresh();
    if (res.ok) {
      const name = slots.find(s => s.id === id)?.name || 'Template';
      notify({ tone: 'success', title: 'Template activated', message: '"' + name + '" will be used for new newsletters.' });
    } else {
      notify({ tone: 'error', title: "Couldn't activate template", message: 'Please try again.' });
    }
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
    const slot = slots.find(s => s.id === id);
    const name = slot?.name || 'this template';
    const ok = await confirm({
      title: 'Delete "' + name + '"?',
      message: (
        <>
          <p>This template will be permanently removed. This can't be undone.</p>
          {slot?.isActive && (
            <p className="mt-2 font-medium text-gray-700">
              This is your active template. New newsletters will use AI-designed layouts until you activate another one.
            </p>
          )}
        </>
      ),
      confirmLabel: 'Delete template',
      tone: 'danger',
    });
    if (!ok) return;

    const res = await fetch("/api/templates/" + id, { method: 'DELETE' });
    if (res.ok) {
      onRefresh();
      notify({ tone: 'success', message: '"' + name + '" was deleted.' });
    } else {
      const err = await res.json().catch(() => ({}));
      notify({ tone: 'error', title: "Couldn't delete template", message: err.error || 'Please try again.' });
    }
  };

  const handleDuplicate = async (id: string) => {
    const res = await fetch("/api/templates/" + id + "/duplicate", { method: 'POST' });
    if (res.ok) {
      onRefresh();
      notify({ tone: 'success', message: 'Template duplicated.' });
    } else {
      const err = await res.json().catch(() => ({}));
      notify({ tone: 'error', title: "Couldn't duplicate template", message: err.error || 'Please try again.' });
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
            onPreview={(s) => setPreviewId(s.id)}
            onActivate={handleActivate}
            onRename={handleRename}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        ))}
      </div>

      {previewing && (
        <TemplatePreviewModal
          template={previewing}
          businessName={businessName}
          onClose={() => setPreviewId(null)}
          onEdit={() => {
            setPreviewId(null);
            onEdit(previewing);
          }}
          onActivate={() => {
            handleActivate(previewing.id);
            setPreviewId(null);
          }}
        />
      )}
    </div>
  );
}
