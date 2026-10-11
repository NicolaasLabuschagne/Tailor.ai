'use client';

import React, { useMemo, useState } from 'react';
import EmailFrame from './EmailFrame';
import { renderCatalogLayout } from '@/lib/newsletter/templateRender';
import { Brand, CatalogLayout, LAYOUT_LABELS, NewsletterContent } from '@/lib/newsletter/types';

export interface CatalogData {
  layouts: CatalogLayout[];
  brand: Brand;
  defaultLayoutId: string | null;
  previewContent: NewsletterContent;
}

type Filter = 'all' | 'template' | 'preset' | 'saved' | 'favorites';

interface Props {
  data: CatalogData;
  currentLayoutId?: string | null;
  // Picker mode: one primary action per card
  onSelect?: (layout: CatalogLayout) => void;
  selectingId?: string | null;
  // Catalog mode: management actions
  onSetDefault?: (layout: CatalogLayout) => void;
  onToggleFavorite?: (layout: CatalogLayout) => void;
  onRename?: (layout: CatalogLayout) => void;
  onDelete?: (layout: CatalogLayout) => void;
  onPreview?: (layout: CatalogLayout) => void;
}

const KIND_LABELS: Record<CatalogLayout['kind'], string> = {
  template: 'Your template',
  preset: 'Built-in',
  saved: 'AI-generated',
};

export default function LayoutGallery({
  data,
  currentLayoutId,
  onSelect,
  selectingId,
  onSetDefault,
  onToggleFavorite,
  onRename,
  onDelete,
  onPreview,
}: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const savedCount = data.layouts.filter((l) => l.kind === 'saved').length;
  const templateCount = data.layouts.filter((l) => l.kind === 'template').length;
  const visible = data.layouts.filter((l) =>
    filter === 'all' ? true : filter === 'favorites' ? l.isFavorite : l.kind === filter
  );

  // Rendering is cheap, but memoize so typing elsewhere doesn't re-render every iframe
  const htmlById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of data.layouts) map[l.id] = renderCatalogLayout(l, data.previewContent, data.brand);
    return map;
  }, [data]);

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: `All (${data.layouts.length})` },
    { key: 'template', label: `My templates (${templateCount})` },
    { key: 'preset', label: 'Polished designs' },
    { key: 'saved', label: `AI-generated (${savedCount})` },
    { key: 'favorites', label: 'Favorites' },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              filter === t.key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500">
          {filter === 'favorites'
            ? 'No favorites yet. Star a layout to keep it handy.'
            : filter === 'template'
              ? 'No templates yet. Create one in the Newsletter Designer (Design in the top menu) and it will appear here.'
              : 'No AI-generated layouts yet. Each new newsletter adds its design here.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {visible.map((layout) => {
            const isCurrent = currentLayoutId === layout.id;
            const isDefault = data.defaultLayoutId === layout.id;
            return (
              <div
                key={layout.id}
                className={`group bg-white rounded-xl border overflow-hidden flex flex-col transition-shadow hover:shadow-md ${
                  isCurrent ? 'border-brand-500 ring-2 ring-brand-500' : 'border-gray-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => (onPreview ? onPreview(layout) : onSelect?.(layout))}
                  className="block w-full text-left bg-gray-100 border-b border-gray-100"
                  title={onPreview ? 'Open full preview' : 'Use this layout'}
                >
                  <EmailFrame html={htmlById[layout.id]} scaleToFit height={300} title={layout.name} />
                </button>

                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{layout.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                        {layout.design && (
                          <span className="inline-block w-2.5 h-2.5 rounded-full border border-black/10" style={{ background: layout.design.accent }} />
                        )}
                        {layout.design ? LAYOUT_LABELS[layout.design.layout] + ' · ' : ''}
                        {KIND_LABELS[layout.kind]}
                        {layout.createdAt && ` · ${new Date(layout.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    {onToggleFavorite && layout.kind === 'saved' && (
                      <button
                        onClick={() => onToggleFavorite(layout)}
                        className={`text-lg leading-none ${layout.isFavorite ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400'}`}
                        title={layout.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        ★
                      </button>
                    )}
                  </div>

                  {layout.design?.mood && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{layout.design.mood}</p>}

                  <div className="flex flex-wrap items-center gap-2 mt-auto pt-4">
                    {isCurrent && <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-brand-50 text-brand-700">Current</span>}
                    {isDefault && <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-green-50 text-green-700">Default for new issues</span>}

                    {onSelect && !isCurrent && (
                      <button
                        onClick={() => onSelect(layout)}
                        disabled={!!selectingId}
                        className="ml-auto px-3 py-1.5 text-xs font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        {selectingId === layout.id ? 'Applying…' : 'Use this layout'}
                      </button>
                    )}

                    {onSetDefault && !isDefault && (
                      <button onClick={() => onSetDefault(layout)} className="text-xs font-medium text-brand-600 hover:text-brand-800">
                        Set as default
                      </button>
                    )}
                    {onRename && layout.kind === 'saved' && (
                      <button onClick={() => onRename(layout)} className="text-xs text-gray-500 hover:text-gray-800">
                        Rename
                      </button>
                    )}
                    {onDelete && layout.kind === 'saved' && (
                      <button onClick={() => onDelete(layout)} className="text-xs text-gray-400 hover:text-red-600 ml-auto">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
