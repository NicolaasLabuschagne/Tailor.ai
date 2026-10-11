import axios from 'axios';
import { RawArticle } from '../types';

// Top Stories has no keyword search, so pick the sections a keyword list points at
// and let filterAndRank keep the stories that actually match.
const SECTION_TRIGGERS: Record<string, string[]> = {
  realestate: ['real estate', 'housing', 'home', 'mortgage', 'property', 'rental', 'realty', 'construction'],
  business: ['business', 'finance', 'market', 'economy', 'interest rate', 'bank', 'retail', 'startup', 'invest', 'marketing', 'sales'],
  technology: ['tech', 'software', 'ai', 'artificial intelligence', 'app', 'digital', 'cyber', 'web', 'saas', 'crypto'],
  health: ['health', 'medical', 'clinic', 'hospital', 'wellness', 'fitness', 'pharma', 'dental', 'patient'],
  food: ['food', 'restaurant', 'dining', 'chef', 'recipe', 'coffee', 'drink', 'bakery'],
  travel: ['travel', 'hotel', 'tourism', 'vacation', 'airline', 'hospitality'],
  science: ['science', 'climate', 'research', 'energy', 'environment'],
  politics: ['politics', 'policy', 'regulation', 'legislation', 'election', 'law', 'legal'],
  sports: ['sport', 'fitness', 'nfl', 'nba', 'soccer', 'golf'],
  fashion: ['fashion', 'apparel', 'beauty', 'luxury', 'style'],
  automobiles: ['car', 'auto', 'vehicle', 'ev', 'dealership'],
  arts: ['art', 'music', 'design', 'gallery', 'entertainment'],
};

const MAX_SECTIONS = 3; // NYT allows 5 requests/minute

export function nytSections(keywords: string[]): string[] {
  const text = keywords.join(' ').toLowerCase();
  const matches = Object.entries(SECTION_TRIGGERS)
    .map(([section, triggers]) => ({ section, hits: triggers.filter(t => new RegExp(`\\b${t}`).test(text)).length }))
    .filter(m => m.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map(m => m.section);
  return (matches.length ? matches : ['business', 'us']).slice(0, MAX_SECTIONS);
}

export async function fetchNYT(keywords: string[], hoursCutoff: number = 24): Promise<RawArticle[]> {
  const cutoff = Date.now() - hoursCutoff * 60 * 60 * 1000;

  const results = await Promise.allSettled(
    nytSections(keywords).map(section =>
      axios.get(`https://api.nytimes.com/svc/topstories/v2/${section}.json`, {
        params: { 'api-key': process.env.NYT_API_KEY },
        timeout: 10000,
      })
    )
  );

  const articles: RawArticle[] = [];
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('NYT API fetch error:', result.reason?.message);
      continue;
    }
    for (const r of result.value.data.results ?? []) {
      const publishedAt = new Date(r.published_date);
      if (!r.title || !r.url || publishedAt.getTime() < cutoff) continue;
      articles.push({
        title: r.title,
        description: r.abstract || '',
        url: r.url,
        source: 'New York Times',
        publishedAt,
        imageUrl: nytImage(r.multimedia),
      });
    }
  }
  return articles;
}

function nytImage(multimedia: any): string | undefined {
  if (!Array.isArray(multimedia)) return undefined;
  const pick =
    multimedia.find((m: any) => m.format === 'threeByTwoSmallAt2X') ||
    multimedia.find((m: any) => m.format === 'Super Jumbo') ||
    multimedia[0];
  return pick?.url;
}
