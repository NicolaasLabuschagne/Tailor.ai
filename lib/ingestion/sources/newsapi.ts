import axios from 'axios';
import { RawArticle } from '../types';

let dailyCallCount = 0;
const MAX_DAILY_CALLS = 80;

export async function fetchNewsAPI(params: { keywords: string[], language: string, country: string }): Promise<RawArticle[]> {
  if (dailyCallCount > MAX_DAILY_CALLS) {
    console.warn('NewsAPI daily quota nearly exhausted, skipping.');
    return [];
  }

  try {
    // Requirements: "Always append country=us parameter"
    // Requirement also implies filtering.
    // Since /everything doesn't support country=us, we use top-headlines for general
    // or just pass it to everything (ignored) and rely on the pipeline.
    // However, if we want to BE US-only as requested,
    // we should use sources from US if using /everything.

    const q = params.keywords.join(' OR ');
    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        q,
        country: 'us',
        language: 'en',
        apiKey: process.env.NEWSAPI_KEY,
        pageSize: 20
      }
    });

    dailyCallCount++;

    return response.data.articles.map((a: any) => ({
      title: a.title,
      description: a.description || '',
      url: a.url,
      source: a.source.name,
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
