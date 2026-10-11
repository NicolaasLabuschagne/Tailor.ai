// Fills a saved template's merge tags (and any mapped content zones) with sample copy,
// so people can see what a template looks like before real content exists. Client-safe.

export interface TemplateContentMap {
  headline?: string | null;
  paragraph1?: string | null;
  paragraph2?: string | null;
  paragraph3?: string | null;
  offerText?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  topicLabel?: string | null;
}

export const SAMPLE_TEMPLATE_CONTENT = {
  SUBJECT: 'What this week means for your business',
  TOPIC_LABEL: 'This week in your industry',
  HEADLINE: 'Small businesses are rethinking how they reach customers',
  PARAGRAPH_1:
    'A new survey of more than 2,000 business owners found that most plan to spend less on paid social media next year, citing rising costs and falling reach. The money is moving toward channels they control directly.',
  PARAGRAPH_2:
    'Email lists, loyalty programs and local events all saw planned increases. Owners say these channels deliver steadier results and build relationships that last beyond a single campaign.',
  PARAGRAPH_3:
    'For most businesses the takeaway is simple: the customers you can reach directly are worth more each year. Starting small and staying consistent matters more than any single tactic.',
  PULL_QUOTE: '62% of owners plan to grow their email list this year.',
  CONNECTION:
    'It is the same shift we have been helping our clients make: fewer rented audiences, more relationships you own.',
  OFFER_TEXT:
    'This month we are offering a free 20-minute review of how your customers find you, with three practical next steps. No obligation.',
  CTA_LABEL: 'Book your free review',
};

const LINK_TAGS = new Set(['CTA_URL', 'WEBSITE_URL', 'UNSUBSCRIBE_LINK']);

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function fillTemplatePreview(
  html: string,
  options: { businessName?: string; contentMap?: TemplateContentMap | string | null } = {}
): string {
  if (!html) return '';
  const sample: Record<string, string> = {
    ...SAMPLE_TEMPLATE_CONTENT,
    BUSINESS_NAME: options.businessName || 'Your Business',
  };

  // {{TAG}} placeholders — links get a harmless "#", unknown tags get a standard paragraph
  let filled = html.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_match, rawTag: string) => {
    const tag = rawTag.toUpperCase();
    if (LINK_TAGS.has(tag)) return '#';
    return escapeHtml(sample[tag] ?? SAMPLE_TEMPLATE_CONTENT.PARAGRAPH_1);
  });

  // Pasted templates mark content zones by CSS selector instead of merge tags
  const map = parseMap(options.contentMap);
  if (map && typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(filled, 'text/html');
    const inject = (selector: string | null | undefined, value: string, attr?: string) => {
      if (!selector) return;
      try {
        const el = doc.querySelector(selector);
        if (!el) return;
        if (attr) el.setAttribute(attr, value);
        else el.textContent = value;
      } catch {
        // invalid selector saved in an old map; skip it
      }
    };
    inject(map.headline, sample.HEADLINE);
    inject(map.paragraph1, sample.PARAGRAPH_1);
    inject(map.paragraph2, sample.PARAGRAPH_2);
    inject(map.paragraph3, sample.PARAGRAPH_3);
    inject(map.offerText, sample.OFFER_TEXT);
    inject(map.ctaLabel, sample.CTA_LABEL);
    inject(map.ctaHref, '#', 'href');
    inject(map.topicLabel, sample.TOPIC_LABEL);
    filled = '<!DOCTYPE html>' + doc.documentElement.outerHTML;
  }

  return filled;
}

function parseMap(map: TemplateContentMap | string | null | undefined): TemplateContentMap | null {
  if (!map) return null;
  if (typeof map !== 'string') return map;
  try {
    return JSON.parse(map);
  } catch {
    return null;
  }
}

// AI models sometimes wrap HTML in markdown fences or add a sentence before it
export function cleanGeneratedHtml(raw: string): string {
  let html = raw.trim().replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '');
  const start = html.search(/<!DOCTYPE|<html|<table|<div/i);
  if (start > 0) html = html.slice(start);
  return html.trim();
}
