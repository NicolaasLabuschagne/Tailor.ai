'use client';

import React, { useState, useEffect } from 'react';

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

const SAMPLE_CONTENT = {
  headline: "AI adoption among small businesses hits record high in 2026",
  paragraph1: "A new report from Deloitte shows that 58% of small businesses in the US now use at least one AI tool in their daily operations, up from 23% just two years ago. The shift is being driven by accessible, affordable tools that require no technical expertise.",
  paragraph2: "The businesses seeing the biggest gains are those using AI for customer communications — automated follow-ups, personalized emails, and instant responses to enquiries. Response time is down, conversion is up.",
  paragraph3: "Analysts expect adoption to accelerate further as costs continue to fall and tools become easier to use. Businesses that haven't started yet are increasingly at a competitive disadvantage.",
  offerText: "We're helping businesses in your industry get set up with the right tools. This month — free 30-minute strategy call, no obligation.",
  ctaLabel: "Book your free call →",
  topicLabel: "This week in technology",
};

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
  const [previewHtml, setPreviewHtml] = useState('');
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

  const generatePreview = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const inject = (selector: string | null, value: string, attr?: string) => {
      if (!selector) return;
      const el = doc.querySelector(selector);
      if (el) {
        if (attr) el.setAttribute(attr, value);
        else el.textContent = value;
      }
    };

    inject(map.headline, SAMPLE_CONTENT.headline);
    inject(map.paragraph1, SAMPLE_CONTENT.paragraph1);
    inject(map.paragraph2, SAMPLE_CONTENT.paragraph2);
    inject(map.paragraph3, SAMPLE_CONTENT.paragraph3);
    inject(map.offerText, SAMPLE_CONTENT.offerText);
    inject(map.ctaLabel, SAMPLE_CONTENT.ctaLabel);
    inject(map.ctaHref, '#', 'href');
    inject(map.topicLabel, SAMPLE_CONTENT.topicLabel);

    setPreviewHtml(doc.documentElement.outerHTML);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ html, contentMap: map });
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      <div className="p-8 space-y-12 max-w-5xl mx-auto w-full">
        <section>
          <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4">Step 1: Paste your HTML template</h2>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            className="w-full h-48 border rounded-lg p-4 font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="<html><body>...</body></html>"
          />
          <button
            onClick={() => extractZones(html)}
            className="mt-4 bg-white border border-gray-300 px-4 py-2 rounded shadow-sm text-sm font-medium hover:bg-gray-50"
          >
            Parse & Extract Zones
          </button>
        </section>

        {zones.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4">Step 2: Map your content zones</h2>
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

        {zones.length > 0 && (
          <section className="pb-20">
            <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4">Step 3: Preview & Save</h2>
            <div className="flex space-x-4 mb-6">
              <button onClick={generatePreview} className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 font-medium">Generate Preview</button>
              <button onClick={handleSave} disabled={isSaving} className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 font-medium">{isSaving ? 'Saving...' : 'Save & Use This Template'}</button>
            </div>

            {previewHtml && (
              <div className="border-t pt-8">
                 <div className="flex justify-center space-x-2 mb-4">
                    <button onClick={() => setView('desktop')} className={"px-3 py-1 rounded " + (view === 'desktop' ? 'bg-gray-800 text-white' : 'bg-gray-200')}>Desktop</button>
                    <button onClick={() => setView('mobile')} className={"px-3 py-1 rounded " + (view === 'mobile' ? 'bg-gray-800 text-white' : 'bg-gray-200')}>Mobile</button>
                 </div>
                 <div className="flex justify-center">
                    <iframe
                      srcDoc={previewHtml}
                      style={{ width: view === 'desktop' ? '600px' : '375px', height: '600px' }}
                      className="border shadow-2xl rounded-lg"
                    />
                 </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
