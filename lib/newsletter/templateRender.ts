// Fills a user's own template (pasted HTML, visual designer or generated from their website)
// with newsletter content. Client-safe: pass a parser on the server (jsdom), the browser's
// DOMParser is used otherwise.
import { Brand, CatalogLayout, NewsletterContent } from './types';
import { renderNewsletter } from './render';

type ParseHtml = (html: string) => Document;

function escapeHtml(text: string): string {
  return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderTemplateWithContent(
  html: string,
  contentMapJson: string | null | undefined,
  content: NewsletterContent,
  brand: { name: string; websiteUrl: string },
  parseHtml?: ParseHtml
): string {
  const paragraphs = content.lead.paragraphs ?? [];
  const websiteUrl = brand.websiteUrl || '#';
  const pullQuote = content.keyStat ? `${content.keyStat.value} — ${content.keyStat.label}` : '';

  const replacements: Record<string, string> = {
    SUBJECT: content.subject,
    TOPIC_LABEL: content.kicker,
    HEADLINE: content.lead.headline,
    PARAGRAPH_1: paragraphs[0] || '',
    PARAGRAPH_2: paragraphs[1] || '',
    PARAGRAPH_3: paragraphs[2] || '',
    PULL_QUOTE: pullQuote,
    CONNECTION: content.connection,
    OFFER_TEXT: content.offer.body,
    CTA_LABEL: content.offer.ctaLabel,
    BUSINESS_NAME: brand.name,
  };
  const links: Record<string, string> = { WEBSITE_URL: websiteUrl, CTA_URL: websiteUrl };

  // Merge tags. The unsubscribe tag is filled per-recipient at send time; unknown tags are dropped
  let shell = (html || '').replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match, raw: string) => {
    const tag = raw.toUpperCase();
    if (tag === 'UNSUBSCRIBE_LINK') return '{{UNSUBSCRIBE_LINK}}';
    if (tag in links) return links[tag];
    return tag in replacements ? escapeHtml(replacements[tag]) : '';
  });

  // Pasted templates mark content zones with CSS selectors instead of merge tags
  const map = parseMap(contentMapJson);
  const parse = parseHtml ?? (typeof DOMParser !== 'undefined' ? (s: string) => new DOMParser().parseFromString(s, 'text/html') : null);
  if (map && parse) {
    const doc = parse(shell);
    const inject = (selector: unknown, value: string, attr?: string) => {
      if (typeof selector !== 'string' || !selector || !value) return;
      try {
        const el = doc.querySelector(selector);
        if (!el) return;
        if (attr) el.setAttribute(attr, value);
        else el.textContent = value;
      } catch {
        // invalid selector in an old map; skip it
      }
    };
    inject(map.headline, content.lead.headline);
    inject(map.paragraph1, paragraphs[0]);
    inject(map.paragraph2, paragraphs[1]);
    inject(map.paragraph3, paragraphs[2]);
    inject(map.offerText, content.offer.body);
    inject(map.ctaLabel, content.offer.ctaLabel);
    inject(map.ctaHref, websiteUrl, 'href');
    inject(map.topicLabel, content.kicker);

    doc.querySelectorAll('a').forEach((a) => {
      if (a.textContent?.toLowerCase().includes('unsubscribe')) a.setAttribute('href', '{{UNSUBSCRIBE_LINK}}');
    });
    shell = '<!DOCTYPE html>' + doc.documentElement.outerHTML;
  }

  return shell;
}

function parseMap(json: string | null | undefined): Record<string, unknown> | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function renderCatalogLayout(layout: CatalogLayout, content: NewsletterContent, brand: Brand): string {
  if (layout.template) return renderTemplateWithContent(layout.template.html, layout.template.contentMap, content, brand);
  return layout.design ? renderNewsletter(content, layout.design, brand) : '';
}
