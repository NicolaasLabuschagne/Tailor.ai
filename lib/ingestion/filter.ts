import { RawArticle } from './types';

const KEYWORD_SYNONYMS: Record<string, string[]> = {
  "software": ["tech", "SaaS", "app", "developer", "programming", "code", "platform", "digital"],
  "website": ["web", "online", "digital", "internet", "site", "SEO", "web design"],
  "marketing": ["advertising", "brand", "campaign", "social media", "content", "SEO", "growth"],
  "real estate": ["housing", "property", "mortgage", "home sales", "rental", "realty"],
  "restaurant": ["food", "dining", "hospitality", "menu", "chef", "eatery"],
  "retail": ["store", "shop", "consumer", "ecommerce", "shopping", "sales"],
  "healthcare": ["health", "medical", "clinical", "patient", "hospital", "pharma"],
  "finance": ["financial", "banking", "investment", "economy", "market", "fiscal"],
  "construction": ["building", "contractor", "housing", "infrastructure", "development"],
  "legal": ["law", "attorney", "court", "regulation", "compliance", "legislation"],
};

export function expandKeywords(keywords: string[]): string[] {
  const expanded = new Set(keywords);
  keywords.forEach(kw => {
    const synonyms = KEYWORD_SYNONYMS[kw.toLowerCase()];
    if (synonyms) synonyms.forEach(s => expanded.add(s));
  });
  return Array.from(expanded);
}

const BLOCKED_DOMAINS = [
  "wsj.com",       // hard paywall
  "ft.com",        // hard paywall
  "bloomberg.com", // hard paywall
  "businessinsider.com", // low quality
  "buzzfeed.com",
  "dailymail.co.uk", // not US focused
  "thesun.co.uk",
  "express.co.uk",
];

const PAYWALL_PATTERNS = ["/subscribe", "/paywall", "/member-exclusive"];

export function filterAndRank(
  articles: RawArticle[],
  keywords: string[],
  maxResults: number = 5
): RawArticle[] {
  const expandedKeywords = expandKeywords(keywords);

  // Step 1: Remove garbage
  const cleaned = articles.filter(a =>
    a.title?.length > 20 &&
    a.description?.length > 40 &&
    a.url?.startsWith("https") &&
    !isPaywalled(a.url) &&
    !isBlocklisted(a.url)
  );

  // Step 2 & 3: US relevance heuristic & Deduplication
  const seen = new Set<string>();
  const unique: RawArticle[] = [];

  for (const a of cleaned) {
    const domain = new URL(a.url).hostname;
    const titleWords = a.title.toLowerCase().split(/\s+/).slice(0, 5).join(' ');
    const dedupKey = `${domain}-${titleWords}`;

    if (!seen.has(dedupKey)) {
      seen.add(dedupKey);
      unique.push(a);
    }
  }

  // Step 4 & 5: Scoring and Freshness
  const scored = unique.map(a => {
    let score = scoreArticle(a, expandedKeywords);

    const ageHours = (Date.now() - a.publishedAt.getTime()) / (1000 * 60 * 60);
    if (ageHours < 6) score += 2;
    else if (ageHours < 12) score += 1;

    return { ...a, relevanceScore: score };
  });

  // Step 6: Sort and Slice
  return scored
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
    .slice(0, maxResults);
}

function scoreArticle(article: RawArticle, keywords: string[]): number {
  const text = (article.title + " " + article.description).toLowerCase();

  return keywords.reduce((score, keyword) => {
    const kw = keyword.toLowerCase();
    if (article.title.toLowerCase().includes(kw)) return score + 3;
    if (article.description.toLowerCase().includes(kw)) return score + 1;
    return score;
  }, 0);
}

function isBlocklisted(url: string): boolean {
  return BLOCKED_DOMAINS.some(d => url.includes(d));
}

function isPaywalled(url: string): boolean {
  return PAYWALL_PATTERNS.some(p => url.includes(p));
}
