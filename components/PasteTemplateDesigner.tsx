'use client';

import React, { useState, useEffect, useMemo } from 'react';
import EmailFrame from './EmailFrame';
import { fillTemplatePreview } from '@/lib/templatePreview';

interface Zone {
  id: string;
  selector: string;
  previewText: string;
  tagName: string;
  isLink: boolean;
}

interface ContentMap {
  headline: string | null;
  paragraph1: string | null;
  paragraph2: string | null;
  paragraph3: string | null;
  offerText: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  topicLabel: string | null;
}

interface Props {
  initialHtml?: string;
  initialMap?: string;
  onSave: (data: { html: string; contentMap: any }) => void;
}

export default function PasteTemplateDesigner({ initialHtml, initialMap, onSave }: Props) {
  const [html, setHtml] = useState(initialHtml || '');
  const [zones, setZones] = useState<Zone[]>([]);
  const [map, setMap] = useState<ContentMap>({
    headline: null, paragraph1: null, paragraph2: null, paragraph3: null,
    offerText: null, ctaLabel: null, ctaHref: null, topicLabel: null
  });
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialHtml) setHtml(initialHtml);
    if (initialMap) {
       try {
         setMap(JSON.parse(initialMap));
       } catch (e) {}
    }
  }, [initialHtml, initialMap]);

  const generateUniqueSelector = (element: HTMLElement): string => {
    let el: HTMLElement | null = element;
    if (el.id) return "#" + el.id;
    let path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      let index = 1;
      let sibling = el.previousSibling;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === el.nodeName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      selector += ":nth-of-type(" + index + ")";
      path.unshift(selector);
      el = el.parentNode as HTMLElement;
    }
    return path.join(' > ');
  };

  const extractZones = (htmlContent: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const candidates: Zone[] = [];
    const selectors = [
      'h1', 'h2', 'h3', 'p', 'a[href]', 'td',
      '[class*="headline"]', '[class*="title"]', '[class*="body"]',
      '[class*="content"]', '[class*="cta"]', '[class*="button"]',
      '[class*="btn"]', '[class*="offer"]', '[class*="promo"]'
    ];

    selectors.forEach(sel => {
      doc.querySelectorAll(sel).forEach((el, i) => {
        const text = el.textContent?.trim();
        if (text && text.length > 2 && text.length < 500) {
          candidates.push({
            id: sel + "-" + i,
            selector: generateUniqueSelector(el as HTMLElement),
            previewText: text.slice(0, 60),
            tagName: el.tagName.toLowerCase(),
            isLink: el.tagName === 'A',
          });
        }
      });
    });

    const unique = Array.from(new Map(candidates.map(c => [c.selector, c])).values());
    setZones(unique);
  };

  // Live preview: merge tags and mapped zones filled with sample copy
  const livePreview = useMemo(() => fillTemplatePreview(html, { contentMap: map }), [html, map]);
  const unfilledTags = /{{s*[A-Za-z0-9_]+s*}}/.test(html);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ html, contentMap: map });
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      <div className="p-8 space-y-12 max-w-5xl mx-auto w-full">
        <section>
          <h2 className="text-sm font-bold text-brand-600 uppercase tracking-widest mb-4">Step 1: Paste your HTML template</h2>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            className="w-full h-48 border rounded-lg p-4 font-mono text-xs focus:ring-2 focus:ring-brand-500 outline-none"
            placeholder="<html><body>...</body></html>"
          />
          <button
            onClick={() => extractZones(html)}
            className="mt-4 bg-white border border-gray-300 px-4 py-2 rounded shadow-sm text-sm font-medium hover:bg-gray-50"
          >
            Parse & Extract Zones
          </button>
        </section>

        {html.trim() && (
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-brand-600 uppercase tracking-widest">Live preview</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {unfilledTags
                    ? 'Merge tags like {{PARAGRAPH_1}} are shown with sample content. Real newsletters fill them automatically.'
                    : 'Map your content zones below to see where newsletter content will go.'}
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs">
                {(['desktop', 'mobile'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={"rounded-md px-3 py-1 capitalize " + (view === v ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500')}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-center rounded-xl bg-gray-100 p-6">
              <div className="bg-white shadow-lg transition-all duration-300" style={{ width: view === 'desktop' ? 640 : 375, maxWidth: '100%' }}>
                <EmailFrame key={view} html={livePreview} title="Template preview" />
              </div>
            </div>
          </section>
        )}

        {zones.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-sm font-bold text-brand-600 uppercase tracking-widest mb-4">Step 2: Map your content zones</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
              {(Object.keys(map) as Array<keyof ContentMap>).map((key) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{key.replace(/([A-Z])/g, ' $1')}</label>
                  <select
                    value={map[key] || ''}
                    onChange={(e) => setMap({ ...map, [key]: e.target.value || null })}
                    className="w-full border rounded-md p-2 text-sm bg-white text-gray-900"
                  >
                    <option value="">-- Not used --</option>
                    {zones.map(z => (
                      <option key={z.id} value={z.selector}>{z.tagName} · "{z.previewText}..."</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>
        )}

        {html.trim() && (
          <section className="pb-20">
            <h2 className="text-sm font-bold text-brand-600 uppercase tracking-widest mb-4">Save</h2>
            <div className="flex space-x-4 mb-6">
              <button onClick={handleSave} disabled={isSaving} className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 font-medium">{isSaving ? 'Saving...' : 'Save & Use This Template'}</button>
            </div>

          </section>
        )}
      </div>
    </div>
  );
}
