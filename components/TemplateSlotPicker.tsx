'use client';

import React from 'react';

interface TemplateSlot {
  id: string;
  name: string;
  source: string;
  createdAt: string;
}

interface Props {
  slots: TemplateSlot[];
  activeSlotId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TemplateSlotPicker({ slots, activeSlotId, onSelect, onDelete }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Saved Templates</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map(slot => (
          <div
            key={slot.id}
            id={`slot-${slot.id}`}
            onClick={() => onSelect(slot.id)}
            className={`relative p-4 rounded-lg border transition-all cursor-pointer group ${activeSlotId === slot.id ? 'border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-600' : 'border-gray-200 bg-white hover:border-indigo-300 shadow-sm'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${slot.source === 'AI_GENERATED' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                {slot.source.replace('_', ' ')}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(slot.id); }}
                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
            <h4 className="text-sm font-bold text-gray-900 truncate pr-6">{slot.name}</h4>
            <p className="text-[10px] text-gray-400 mt-1">{new Date(slot.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
