'use client';

import React, { useMemo, useState } from 'react';
import EmailFrame from './EmailFrame';
import { fillTemplatePreview } from '@/lib/templatePreview';

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
  slot: Template;
  onEdit: (slot: Template) => void;
  onPreview: (slot: Template) => void;
  onActivate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export default function TemplateSlotCard({ slot, onEdit, onPreview, onActivate, onRename, onDelete, onDuplicate }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(slot.name);
  const previewHtml = useMemo(
    () => (slot.templateHtml ? fillTemplatePreview(slot.templateHtml, { contentMap: slot.contentMap }) : ''),
    [slot.templateHtml, slot.contentMap]
  );

  if (slot.isEmpty) {
    return (
      <div
        onClick={() => onEdit(slot)}
        className="w-[120px] h-[140px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-gray-50 transition-all group"
      >
        <span className="text-2xl text-gray-300 group-hover:text-brand-400">+</span>
        <span className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Add Template</span>
      </div>
    );
  }

  return (
    <div className={"relative w-[120px] h-[140px] rounded-lg border-2 transition-all " + (slot.isActive ? 'border-teal-500 shadow-md ring-1 ring-teal-500' : 'border-gray-200 bg-white hover:border-brand-300')}>
      <div className="h-[80px] bg-gray-50 rounded-t-md overflow-hidden relative group text-gray-900">
        {slot.thumbnail ? (
          <img src={slot.thumbnail} alt={slot.name} className="w-full h-full object-cover" />
        ) : previewHtml ? (
          <EmailFrame html={previewHtml} scaleToFit height={80} title={slot.name} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex flex-col items-center justify-center gap-1.5 transition-opacity">
           <button onClick={() => onPreview(slot)} className="text-[10px] bg-brand-600 text-white px-2 py-1 rounded font-bold w-16">PREVIEW</button>
           <button onClick={() => onEdit(slot)} className="text-[10px] bg-white text-gray-900 px-2 py-1 rounded font-bold w-16">EDIT</button>
        </div>
        <button
          onClick={() => onDelete(slot.id)}
          title="Delete template"
          aria-label={"Delete " + slot.name}
          className="absolute top-1 right-1 z-10 h-6 w-6 flex items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>

      <div className="p-2">
        <div className="flex justify-between items-start">
          {isRenaming ? (
            <input
              autoFocus
              className="text-[10px] w-full border-b focus:outline-none bg-white text-gray-900"
              value={newName}
              onBlur={() => { onRename(slot.id, newName); setIsRenaming(false); }}
              onKeyDown={e => e.key === 'Enter' && (e.target as any).blur()}
              onChange={e => setNewName(e.target.value)}
            />
          ) : (
            <h4 className="text-[10px] font-bold text-gray-700 truncate cursor-pointer" onClick={() => setIsRenaming(true)}>{slot.name}</h4>
          )}
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="text-gray-400 hover:text-gray-600">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-1 w-24 bg-white shadow-xl rounded border border-gray-100 z-30 flex flex-col py-1">
                  <button onClick={() => { onPreview(slot); setShowMenu(false); }} className="text-[10px] px-2 py-1.5 text-left hover:bg-gray-50 text-gray-700">Preview</button>
                  {!slot.isActive && <button onClick={() => { onActivate(slot.id); setShowMenu(false); }} className="text-[10px] px-2 py-1.5 text-left hover:bg-gray-50 text-gray-700">Activate</button>}
                  <button onClick={() => { setIsRenaming(true); setShowMenu(false); }} className="text-[10px] px-2 py-1.5 text-left hover:bg-gray-50 text-gray-700">Rename</button>
                  <button onClick={() => { onDuplicate(slot.id); setShowMenu(false); }} className="text-[10px] px-2 py-1.5 text-left hover:bg-gray-50 text-gray-700">Duplicate</button>
                  <button onClick={() => { onDelete(slot.id); setShowMenu(false); }} className="text-[10px] px-2 py-1.5 text-left hover:bg-gray-50 text-red-600">Delete</button>
                </div>
              </>
            )}
          </div>
        </div>
        {slot.isActive && (
          <div className="flex items-center text-teal-600 text-[8px] font-bold uppercase mt-1">
             <svg className="h-2 w-2 mr-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
             Active
          </div>
        )}
      </div>
    </div>
  );
}
