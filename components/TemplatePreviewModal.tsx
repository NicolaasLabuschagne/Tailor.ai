'use client';

import React, { useEffect, useMemo, useState } from 'react';
import EmailFrame from './EmailFrame';
import { fillTemplatePreview } from '@/lib/templatePreview';

export interface PreviewableTemplate {
  id: string;
  name: string;
  source: string;
  isActive: boolean;
  templateHtml?: string | null;
  contentMap?: string | null;
}

interface Props {
  template: PreviewableTemplate;
  businessName?: string;
  onClose: () => void;
  onEdit: () => void;
  onActivate: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  AI_GENERATED: 'Generated from your website',
  PASTED: 'Pasted HTML',
  UNLAYER: 'Visual designer',
  CUSTOM: 'Custom',
};

export default function TemplatePreviewModal({ template, businessName, onClose, onEdit, onActivate }: Props) {
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop');
  const html = useMemo(
    () => fillTemplatePreview(template.templateHtml || '', { businessName, contentMap: template.contentMap }),
    [template, businessName]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/60 p-4 sm:p-8"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label={`Preview of ${template.name}`} className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{template.name}</p>
            <p className="text-xs text-gray-500">
              {SOURCE_LABELS[template.source] ?? template.source} · Shown with sample content
              {template.isActive && <span className="ml-2 font-semibold text-teal-600">● Active</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs">
              {(['desktop', 'mobile'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-md px-3 py-1 capitalize ${view === v ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button onClick={onEdit} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
              Edit
            </button>
            {!template.isActive && (
              <button onClick={onActivate} className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700">
                Use this template
              </button>
            )}
            <button onClick={onClose} className="px-1 text-2xl leading-none text-gray-400 hover:text-gray-700" aria-label="Close preview">
              ×
            </button>
          </div>
        </div>

        <div className="flex justify-center bg-gray-100 p-4 sm:p-8">
          {html ? (
            <div className="bg-white shadow-lg transition-all duration-300" style={{ width: view === 'desktop' ? 640 : 375, maxWidth: '100%' }}>
              <EmailFrame key={view} html={html} title={template.name} />
            </div>
          ) : (
            <p className="py-24 text-sm text-gray-500">This template has no HTML yet. Open it in the editor to design it.</p>
          )}
        </div>
      </div>
    </div>
  );
}
