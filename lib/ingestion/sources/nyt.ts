import axios from 'axios';
import { RawArticle } from '../types';

export async function fetchNYT(keywords: string[]): Promise<RawArticle[]> {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const q = keywords.join(' ');

    const response = await axios.get('https://api.nytimes.com/svc/search/v2/articlesearch.json', {
      params: {
        'api-key': process.env.NYT_API_KEY,
        'fq': `document_type:("article") AND pub_date:[${yesterday}T00:00:00Z TO *]`,
        'q': q,
        'sort': 'newest',
        'fl': 'headline,abstract,web_url,pub_date,source'
      }
    });

    return response.data.response.docs.map((d: any) => ({
      title: d.headline.main,
      description: d.abstract || '',
      url: d.web_url,
      source: 'New York Times',
      publishedAt: new Date(d.pub_date)
    }));
  } catch (error: any) {
    console.error('NYT API fetch error:', error.message);
    return [];
  }
}
