export interface RawArticle {
  title: string
  description: string
  url: string
  source: string
  publishedAt: Date
  relevanceScore?: number
  isTrending?: boolean;
  imageUrl?: string;
}

export interface IngestionQuery {
  keywords: string[]
  topicSlug?: string
  maxResults?: number
}

// "a OR \"real estate\"" — quote multi-word keywords so search APIs treat them as phrases
export function orQuery(keywords: string[]): string {
  return keywords.map(k => (/\s/.test(k.trim()) ? `"${k.trim()}"` : k.trim())).filter(Boolean).join(' OR ');
}
