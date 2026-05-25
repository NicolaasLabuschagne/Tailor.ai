import axios from 'axios';
import { RawArticle } from '../types';

export async function fetchGuardian(keywords: string[]): Promise<RawArticle[]> {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const q = keywords.join(' OR ');

    const response = await axios.get('https://content.guardianapis.com/search', {
      params: {
        'api-key': process.env.GUARDIAN_API_KEY,
        'lang': 'en',
        'production-office': 'us',
        'show-fields': 'trailText,thumbnail',
        'page-size': 10,
        'from-date': yesterday,
        'q': q
      }
    });

    return response.data.response.results.map((r: any) => ({
      title: r.fields?.headline || r.webTitle,
      description: r.fields?.trailText || '',
      url: r.webUrl,
      source: 'The Guardian',
      publishedAt: new Date(r.webPublicationDate)
    }));
  } catch (error: any) {
    console.error('Guardian API fetch error:', error.message);
    return [];
  }
}
