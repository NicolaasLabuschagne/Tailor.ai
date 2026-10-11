'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import LayoutGallery, { CatalogData } from '@/components/LayoutGallery';
import EmailFrame from '@/components/EmailFrame';
import { renderCatalogLayout } from '@/lib/newsletter/templateRender';
import { CatalogLayout, LAYOUT_LABELS } from '@/lib/newsletter/types';
import { useDialogs } from '@/components/ui/Dialogs';

export default function LayoutCatalogPage() {
  const { confirm, prompt, notify } = useDialogs();
  const [data, setData] = useState<CatalogData | null>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<CatalogLayout | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/layouts');
    if (!res.ok) return setError('Could not load layouts');
    setData(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setDefault = async (layoutId: string | null) => {
    const res = await fetch('/api/layouts/default', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layoutId }),
    });
    if (!res.ok || !data) {
      return notify({ tone: 'error', title: "Couldn't update the default", message: 'Please try again.' });
    }
    setData({ ...data, defaultLayoutId: layoutId });
    const chosen = data.layouts.find((l) => l.id === layoutId);
    notify({
      tone: 'success',
      message: chosen ? `New newsletters will use “${chosen.name}”.` : 'The AI will design each new newsletter.',
    });
  };

  const patch = async (layout: CatalogLayout, body: Record<string, unknown>, successMessage?: string) => {
    const res = await fetch(`/api/layouts/${layout.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return notify({ tone: 'error', title: "Couldn't update layout", message: 'Please try again.' });
    load();
    if (successMessage) notify({ tone: 'success', message: successMessage });
  };

  const rename = async (layout: CatalogLayout) => {
    const name = await prompt({
      title: 'Rename layout',
      label: 'Layout name',
      defaultValue: layout.name,
      placeholder: 'e.g. Spring Editorial',
      confirmLabel: 'Rename',
    });
    if (name && name !== layout.name) patch(layout, { name }, `Renamed to “${name}”.`);
  };

  const remove = async (layout: CatalogLayout) => {
    const ok = await confirm({
      title: `Delete “${layout.name}”?`,
      message: 'It will be removed from your catalog. Newsletters already using this layout keep their design.',
      confirmLabel: 'Delete layout',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await fetch(`/api/layouts/${layout.id}`, { method: 'DELETE' });
    if (!res.ok) return notify({ tone: 'error', title: "Couldn't delete layout", message: 'Please try again.' });
    load();
    notify({ tone: 'success', message: `“${layout.name}” was deleted.` });
  };

  const defaultLayout = data?.layouts.find((l) => l.id === data.defaultLayoutId);
  const previewHtml = useMemo(
    () => (preview && data ? renderCatalogLayout(preview, data.previewContent, data.brand) : ''),
    [preview, data]
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Layout catalog</h1>
        <p className="mt-1 text-sm text-gray-500 max-w-2xl">
          Your own templates from the Newsletter Designer, our polished built-in layouts, and every design the AI art director creates. Previews use your latest newsletter.
        </p>
      </div>

      {error && <div className="mb-6 rounded-md bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}

      {data && (
        <>
          <div className="mb-8 bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Design for new newsletters</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {defaultLayout
                  ? `Every new issue uses “${defaultLayout.name}”. You can still change any single issue.`
                  : 'The AI art director designs each issue to fit its content and your brand.'}
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50 text-sm">
              <button
                onClick={() => setDefault(null)}
                className={`px-3 py-1.5 rounded-md ${!data.defaultLayoutId ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-500'}`}
              >
                ✨ AI designs each issue
              </button>
              <span
                className={`px-3 py-1.5 rounded-md ${data.defaultLayoutId ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-400'}`}
                title="Use “Set as default” on any layout below"
              >
                Fixed layout{defaultLayout ? `: ${defaultLayout.name}` : ''}
              </span>
            </div>
          </div>

          <LayoutGallery
            data={data}
            onPreview={setPreview}
            onSetDefault={(l) => setDefault(l.id)}
            onToggleFavorite={(l) => patch(l, { isFavorite: !l.isFavorite })}
            onRename={rename}
            onDelete={remove}
          />
        </>
      )}

      {!data && !error && <div className="py-24 text-center text-sm text-gray-500">Loading layouts…</div>}

      {preview && data && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 sm:p-8 overflow-y-auto" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <div>
                <p className="text-sm font-semibold text-gray-900">{preview.name}</p>
                <p className="text-xs text-gray-500">{preview.design ? LAYOUT_LABELS[preview.design.layout] + (preview.design.mood ? ` · ${preview.design.mood}` : '') : 'Your template from the Newsletter Designer'}</p>
              </div>
              <div className="flex items-center gap-3">
                {data.defaultLayoutId !== preview.id && (
                  <button onClick={() => setDefault(preview.id)} className="px-3 py-1.5 text-xs font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700">
                    Set as default
                  </button>
                )}
                <button onClick={() => setPreview(null)} className="text-2xl leading-none text-gray-400 hover:text-gray-700" aria-label="Close">×</button>
              </div>
            </div>
            <EmailFrame html={previewHtml} title={preview.name} />
          </div>
        </div>
      )}
    </div>
  );
}
