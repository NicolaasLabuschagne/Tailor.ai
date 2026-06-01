export interface RawArticle {
  title: string
  description: string
  url: string
  source: string
  publishedAt: Date
  relevanceScore?: number
  isTrending?: boolean;
}

export interface IngestionQuery {
  keywords: string[]
  topicSlug?: string
  maxResults?: number
}
