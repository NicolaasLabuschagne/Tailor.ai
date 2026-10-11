'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import LayoutGallery, { CatalogData } from './LayoutGallery';
import { CatalogLayout } from '@/lib/newsletter/types';

interface Props {
  jobId: string;
  currentLayoutId: string | null;
  onClose: () => void;
  onApplied: (job: any) => void;
}

// Pick a catalog layout for one newsletter. Previews use that newsletter's own content.
export default function LayoutPickerModal({ jobId, currentLayoutId, onClose, onApplied }: Props) {
  const [data, setData] = useState<CatalogData | null>(null);
  const [error, setError] = useState('');
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/layouts?jobId=${encodeURIComponent(jobId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not load layouts'))))
      .then(setData)
      .catch((e) => setError(e.message));
  }, [jobId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !selectingId && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, selectingId]);

  const apply = async (body: { layoutId: string } | { redesign: true }, busyId: string) => {
    setSelectingId(busyId);
    setError('');
    const res = await fetch(`/api/newsletters/${jobId}/layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setSelectingId(null);
    if (!res.ok) return setError(json.error || 'Failed to change layout');
    onApplied(json);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 sm:p-8 overflow-y-auto" onClick={() => !selectingId && onClose()}>
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b bg-white rounded-t-2xl sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Choose a layout</h2>
            <p className="text-sm text-gray-500">Your content stays the same — only the design changes.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => apply({ redesign: true }, 'redesign')}
              disabled={!!selectingId}
              className="px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {selectingId === 'redesign' ? 'Designing…' : '✨ Let AI design a new one'}
            </button>
            <Link href="/dashboard/layouts" className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900">
              Manage catalog
            </Link>
            <button onClick={onClose} disabled={!!selectingId} className="px-2 py-1 text-2xl leading-none text-gray-400 hover:text-gray-700" aria-label="Close">
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && <div className="mb-4 rounded-md bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}
          {data ? (
            <LayoutGallery
              data={data}
              currentLayoutId={currentLayoutId}
              selectingId={selectingId}
              onSelect={(layout: CatalogLayout) => apply({ layoutId: layout.id }, layout.id)}
            />
          ) : (
            !error && <div className="py-24 text-center text-sm text-gray-500">Loading layouts…</div>
          )}
        </div>
      </div>
    </div>
  );
}
