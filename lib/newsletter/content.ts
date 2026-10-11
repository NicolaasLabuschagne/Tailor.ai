import { BusinessProfile, User } from '@prisma/client';
import { RawArticle } from '../ingestion/types';
import { generateJSON } from '../groq';
import { NewsletterContent, StoryRef } from './types';

const SYSTEM_PROMPT = `You are the editor of a premium email newsletter written on behalf of a business.
You turn real news into a polished, genuinely useful issue for the business's audience, in the business's own voice.

Write like a sharp columnist at a respected publication:
- Lead with the concrete fact, not throat-clearing. Never open with "In today's fast-paced world", "the landscape", "exciting news" or similar.
- Short, confident sentences. Specific numbers, names and dates from the articles. No hype, no exclamation marks, no emoji.
- Use ONLY facts present in the provided articles. Never invent statistics, quotes or details, and do not add your own calculations or example figures.
- Never attach a location to a fact unless the article states it: a national figure stays national ("U.S. mortgage rates"), even if the audience is local.
- If an article is clearly unrelated to the audience, leave it out rather than forcing a connection.
- The tie-in to the business must feel like a knowledgeable friend's aside, never a sales pitch. Avoid "that's where we come in" and "this is why you need us".
- No bullet points inside paragraphs. Plain text only: no HTML, no markdown.

Return ONLY a JSON object with exactly this shape:
{
  "subject": "Specific, curiosity-driven subject line under 60 characters. No clickbait, no ALL CAPS.",
  "preheader": "Inbox preview text under 100 characters that complements (not repeats) the subject.",
  "kicker": "2-3 word section label, e.g. 'Market watch'",
  "intro": "1-2 sentence opening note from the business to the reader that frames this issue.",
  "lead": {
    "articleIndex": 0,
    "headline": "Clear, specific headline for the lead story (rewrite, don't copy)",
    "dek": "One-sentence standfirst that says why it matters",
    "paragraphs": ["2-3 paragraphs: what happened, why it matters to the audience, one sharp insight"]
  },
  "keyStat": { "value": "A number from the articles, e.g. '4.2%'", "label": "What the number means, under 90 characters" },
  "stories": [
    { "articleIndex": 1, "headline": "Short rewritten headline", "summary": "One or two sentences on why it matters to this audience" }
  ],
  "connection": "2-3 sentences naturally linking the lead story to the business's work.",
  "offer": { "headline": "Benefit-led headline for the offer", "body": "2-3 helpful, low-pressure sentences about the offer", "ctaLabel": "Specific 2-4 word button label, never 'Click here' or 'Learn more'" },
  "signoff": "Short sign-off line, e.g. 'Until next week, Sam' or the business name"
}

Rules for the structure:
- "stories" must contain 2 or 3 items, each from a DIFFERENT article than the lead and each other.
- Set "keyStat" to null if the articles contain no meaningful number.
- Lead paragraphs total 150-220 words. Whole issue under 450 words.`;

interface RawContent {
  subject?: string;
  preheader?: string;
  kicker?: string;
  intro?: string;
  lead?: { articleIndex?: number; headline?: string; dek?: string; paragraphs?: string[] };
  keyStat?: { value?: string; label?: string } | null;
  stories?: { articleIndex?: number; headline?: string; summary?: string }[];
  connection?: string;
  offer?: { headline?: string; body?: string; ctaLabel?: string };
  signoff?: string;
}

const str = (v: unknown, max = 600) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function writeNewsletterContent(
  profile: BusinessProfile & { user: User },
  articles: RawArticle[],
  opts: { editNote?: string | null; topStoryIsTrending?: boolean } = {}
): Promise<NewsletterContent> {
  const trending = opts.topStoryIsTrending
    ? `\nNote: article [0] is a viral trending story that may sit outside ${profile.businessName}'s industry. If you lead with it, find a clever, genuinely insightful angle for ${profile.targetAudience}; if no natural angle exists, lead with a more relevant article instead.\n`
    : '';

  const userPrompt = `Business: ${profile.businessName}
Industry: ${profile.industry}
Audience: ${profile.targetAudience} (use this to choose angles and tone — never insert the audience's city or region into a fact the article doesn't place there)
Products / services: ${profile.productsServices}
Brand voice: ${profile.brandVoice} — ${profile.tone}
Current offer: ${profile.currentOffers}
Primary call to action: ${profile.primaryCTA}
Owner name (for sign-off, may be blank): ${profile.user.name || ''}
${trending}${opts.editNote ? `\nClient feedback on the previous draft — address this directly: ${opts.editNote}\n` : ''}
Articles:
${articles.map((a, i) => `[${i}] ${a.title}\n    ${a.description}\n    Source: ${a.source}`).join('\n')}

Before answering, check every sentence: each number, place and claim must appear in the articles above. Remove any payment estimates, example loans, percentages or totals you calculated yourself.`;

  // Retry if Groq rejects the JSON or the draft comes back thin; keep the most complete attempt
  const wantStories = Math.min(2, articles.length - 1);
  let best: NewsletterContent | null = null;
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await generateJSON<RawContent>(SYSTEM_PROMPT, userPrompt, 0.5, 'medium');
      const content = normalizeContent(raw, articles, profile);
      if (!best || completeness(content) > completeness(best)) best = content;
      if (content.stories.length >= wantStories && content.connection && content.offer.body !== profile.currentOffers) break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!best) throw lastError;
  return verifyImages(best);
}

function completeness(c: NewsletterContent): number {
  return c.stories.length * 2 + (c.connection ? 1 : 0) + (c.keyStat ? 1 : 0) + (c.intro ? 1 : 0);
}

// Hotlink-protected or dead images render as broken boxes in the inbox, so drop them up front
async function verifyImages(content: NewsletterContent): Promise<NewsletterContent> {
  const check = async (src?: string) => {
    if (!src) return undefined;
    try {
      const res = await fetch(src, { method: 'GET', headers: { Range: 'bytes=0-1023' }, signal: AbortSignal.timeout(5000) });
      return res.ok && (res.headers.get('content-type') ?? '').startsWith('image/') ? src : undefined;
    } catch {
      return undefined;
    }
  };
  const [leadImage, ...storyImages] = await Promise.all([check(content.lead.imageUrl), ...content.stories.map((s) => check(s.imageUrl))]);
  return {
    ...content,
    lead: { ...content.lead, imageUrl: leadImage },
    stories: content.stories.map((s, i) => ({ ...s, imageUrl: storyImages[i] })),
  };
}

function articleAt(articles: RawArticle[], index: unknown): RawArticle | undefined {
  return typeof index === 'number' && Number.isInteger(index) ? articles[index] : undefined;
}

function normalizeContent(raw: RawContent, articles: RawArticle[], profile: BusinessProfile): NewsletterContent {
  const leadArticle = articleAt(articles, raw.lead?.articleIndex) ?? articles[0];
  // Figures the model may cite: anything in the articles or the business's own offer copy
  const known = new Set(figures([...articles.map((a) => `${a.title} ${a.description}`), profile.currentOffers, profile.productsServices].join(' ')));
  const factual = (text: string) => dropUnsupportedFigures(text, known);

  const paragraphs = (Array.isArray(raw.lead?.paragraphs) ? raw.lead!.paragraphs : [])
    .map((p) => factual(str(p, 1200)))
    .filter(Boolean)
    .slice(0, 4);

  if (!str(raw.lead?.headline) || paragraphs.length === 0) {
    throw new Error('AI returned an incomplete newsletter (missing lead story)');
  }

  const used = new Set<string>([leadArticle?.url]);
  const stories: StoryRef[] = [];
  for (const s of Array.isArray(raw.stories) ? raw.stories : []) {
    const article = articleAt(articles, s.articleIndex);
    if (!article || used.has(article.url) || !str(s.headline)) continue;
    used.add(article.url);
    stories.push({
      headline: str(s.headline, 160),
      summary: factual(str(s.summary, 400)),
      sourceName: article.source,
      sourceUrl: article.url,
      imageUrl: article.imageUrl,
    });
    if (stories.length === 3) break;
  }

  const stat = raw.keyStat && str(raw.keyStat.value, 24) && str(raw.keyStat.label) && !figures(str(raw.keyStat.value)).some((n) => !known.has(n)) ? raw.keyStat : null;

  return {
    subject: str(raw.subject, 120) || `This week from ${profile.businessName}`,
    preheader: str(raw.preheader, 160),
    kicker: str(raw.kicker, 40) || 'This week',
    intro: factual(str(raw.intro)),
    lead: {
      headline: str(raw.lead!.headline, 200),
      dek: factual(str(raw.lead!.dek, 300)),
      paragraphs,
      sourceName: leadArticle?.source ?? '',
      sourceUrl: leadArticle?.url ?? '',
      imageUrl: leadArticle?.imageUrl,
    },
    keyStat: stat ? { value: str(stat.value, 24), label: str(stat.label, 160) } : null,
    stories,
    connection: factual(str(raw.connection, 800)),
    offer: {
      headline: str(raw.offer?.headline, 160) || profile.currentOffers.slice(0, 120),
      body: str(raw.offer?.body, 600) || profile.currentOffers,
      ctaLabel: str(raw.offer?.ctaLabel, 40) || profile.primaryCTA || 'Get started',
    },
    signoff: str(raw.signoff, 120) || profile.businessName,
    issueDate: new Date().toISOString(),
  };
}

// Dollar amounts and percentages, normalized ("$300,000" -> "$300000", "4.2 %" -> "4.2%")
const FIGURE = /\$\s?\d[\d,]*(?:\.\d+)?|\d+(?:\.\d+)?\s?%/g;

function figures(text: string): string[] {
  return (text.match(FIGURE) ?? []).map((f) => f.replace(/[\s,]/g, ''));
}

// The model sometimes adds its own estimates ("adds $30 a month on a $300,000 loan").
// Drop any sentence citing a dollar amount or percentage that no source contains.
function dropUnsupportedFigures(text: string, known: Set<string>): string {
  return text
    .split(/(?<=[.!?])\s+/) // sentence breaks only; keeps decimals like 7.44% intact
    .filter((s) => figures(s).every((n) => known.has(n)))
    .join(' ')
    .trim();
}
