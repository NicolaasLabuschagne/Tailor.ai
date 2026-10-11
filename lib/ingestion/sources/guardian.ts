import axios from 'axios';
import { RawArticle, orQuery } from '../types';

export async function fetchGuardian(keywords: string[], hoursCutoff: number = 24): Promise<RawArticle[]> {
  try {
    const cutoff = new Date(Date.now() - hoursCutoff * 60 * 60 * 1000).toISOString();
    const response = await axios.get('https://content.guardianapis.com/search', {
      params: {
        'api-key': process.env.GUARDIAN_API_KEY,
        'lang': 'en',
        'production-office': 'us',
        'show-fields': 'trailText,thumbnail',
        'page-size': 10,
        'from-date': cutoff,
        'q': orQuery(keywords),
        // Match on headline/standfirst only; body matches pull in unrelated stories
        'query-fields': 'headline,trailText',
      },
      timeout: 10000,
    });

    return response.data.response.results.map((r: any) => ({
      title: r.fields?.headline || r.webTitle,
      description: r.fields?.trailText || '',
      url: r.webUrl,
      source: 'The Guardian',
      imageUrl: r.fields?.thumbnail || undefined,
      publishedAt: new Date(r.webPublicationDate)
    }));
  } catch (error: any) {
    console.error('Guardian API fetch error:', error.message);
    return [];
  }
}
