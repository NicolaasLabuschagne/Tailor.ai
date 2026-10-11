import axios from 'axios';
import { RawArticle, orQuery } from '../types';

let dailyCallCount = 0;
const MAX_DAILY_CALLS = 80;

export async function fetchNewsAPI(params: { keywords: string[], language: string, country: string }): Promise<RawArticle[]> {
  if (dailyCallCount > MAX_DAILY_CALLS) {
    console.warn('NewsAPI daily quota nearly exhausted, skipping.');
    return [];
  }

  try {
    // /top-headlines returns almost nothing for keyword ORs, so search /everything instead.
    // It has no country filter; relevance ranking downstream keeps results on-topic.
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: orQuery(params.keywords),
        language: params.language,
        sortBy: 'publishedAt',
        from: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        apiKey: process.env.NEWSAPI_KEY,
        pageSize: 20
      },
      timeout: 10000,
    });

    dailyCallCount++;

    return response.data.articles.map((a: any) => ({
      title: a.title,
      description: a.description || '',
      url: a.url,
      source: a.source.name,
      imageUrl: a.urlToImage || undefined,
      publishedAt: new Date(a.publishedAt)
    }));
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.warn('NewsAPI quota exceeded (429).');
      return [];
    }
    console.error('NewsAPI fetch error:', error.message);
    return [];
  }
}
