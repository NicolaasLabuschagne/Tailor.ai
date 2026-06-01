import Parser from 'rss-parser';
import he from 'he';
import { RawArticle } from '../types';

const parser = new Parser();

export const TOPIC_FEEDS: Record<string, string[]> = {
  real_estate: [
    "https://www.cnbc.com/id/10000664/device/rss/rss.html",
    "https://feeds.feedburner.com/inman/allnews",
  ],
  interest_rates: [
    "https://www.cnbc.com/id/10001147/device/rss/rss.html",
  ],
  finance: [
    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
    "https://feeds.reuters.com/reuters/businessNews",
  ],
  crypto: [
    "https://techcrunch.com/feed/",
  ],
  startups: [
    "https://techcrunch.com/feed/",
  ],
  ai_tech: [
    "https://techcrunch.com/feed/",
    "https://hnrss.org/frontpage",
    "https://feeds.feedburner.com/venturebeat/SZYF",
  ],
  cybersecurity: [
    "https://techcrunch.com/feed/",
  ],
  big_tech: [
    "https://techcrunch.com/feed/",
    "https://www.cnbc.com/id/10001147/device/rss/rss.html",
  ],
  global_news: [
    "https://feeds.npr.org/1004/rss.xml",
  ],
  us_politics: [
    "https://rss.politico.com/politics-news.xml",
    "https://feeds.npr.org/1014/rss.xml",
  ],
  health: [
    "https://feeds.npr.org/1128/rss.xml",
    "https://www.cnbc.com/id/10000108/device/rss/rss.html",
    "https://www.medscape.com/rss/publichealth",
  ],
  climate: [
    "https://feeds.npr.org/1025/rss.xml",
  ],
  future_of_work: [
    "https://techcrunch.com/feed/",
  ],
  science: [
    "https://feeds.npr.org/1007/rss.xml",
  ],
  sports: [
    "https://www.espn.com/espn/rss/news",
    "https://www.espn.com/espn/rss/nfl/news",
    "https://www.espn.com/espn/rss/nba/news",
  ],
  food_drink: [
    "https://www.cnbc.com/id/10000108/device/rss/rss.html",
  ],
  travel: [
    "https://www.cnbc.com/id/10000739/device/rss/rss.html",
  ],
  luxury: [
    "https://www.cnbc.com/id/10000739/device/rss/rss.html",
  ],
};

export const GENERAL_US_FEEDS = [
  "https://feeds.npr.org/1001/rss.xml",
  "https://www.cnbc.com/id/100003114/device/rss/rss.html",
  "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
];

export async function fetchRSS(urls: string[], keywords: string[], hoursCutoff: number = 24): Promise<RawArticle[]> {
  const articles: RawArticle[] = [];
  const cutoff = new Date(Date.now() - hoursCutoff * 60 * 60 * 1000);

  const results = await Promise.allSettled(urls.map(url => parser.parseURL(url)));

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const feed = result.value;
      for (const item of feed.items) {
        const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
        if (pubDate < cutoff) continue;

        const description = item.contentSnippet || item.content || '';
        const cleanDescription = he.decode(description.replace(/<[^>]*>?/gm, '')).trim();
        const cleanTitle = he.decode(item.title || '').trim();

        articles.push({
          title: cleanTitle,
          description: cleanDescription,
          url: item.link || '',
          source: feed.title || 'RSS Feed',
          publishedAt: pubDate,
        });
      }
    }
  }

  return articles;
}
