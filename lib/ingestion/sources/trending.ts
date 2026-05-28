import Parser from 'rss-parser';
import axios from 'axios';
import { RawArticle } from '../types';

const parser = new Parser();

export async function fetchTrending(): Promise<RawArticle[]> {
  const [reddit, apple, hn] = await Promise.allSettled([
    fetchRedditTrending(),
    fetchAppleTrending(),
    fetchHNTrending(),
  ]);

  const all: RawArticle[] = [
    ...(reddit.status === 'fulfilled' ? reddit.value : []),
    ...(apple.status === 'fulfilled' ? apple.value : []),
    ...(hn.status === 'fulfilled' ? hn.value : []),
  ];

  // Deduplicate by domain
  const seenDomains = new Set<string>();
  const unique: RawArticle[] = [];

  for (const a of all) {
    try {
      const domain = new URL(a.url).hostname;
      if (!seenDomains.has(domain)) {
        seenDomains.add(domain);
        unique.push(a);
      }
    } catch (e) {
       // Skip malformed URLs
    }
  }

  return unique
    .sort((a, b) => ((b as any).trendingScore || 0) - ((a as any).trendingScore || 0))
    .slice(0, 10);
}

async function fetchRedditTrending(): Promise<RawArticle[]> {
  const feeds = [
    'https://www.reddit.com/r/news/top.rss?t=day',
    'https://www.reddit.com/r/worldnews/top.rss?t=day',
    'https://www.reddit.com/r/technology/top.rss?t=day',
    'https://www.reddit.com/r/business/top.rss?t=day',
  ];

  const results = await Promise.allSettled(feeds.map(url => parser.parseURL(url)));
  const articles: RawArticle[] = [];

  for (const res of results) {
    if (res.status === 'fulfilled') {
      res.value.items.forEach(item => {
        const score = parseInt((item as any).score) || 0;
        articles.push({
          title: item.title || '',
          description: '',
          url: item.link || '',
          source: `Reddit: ${res.value.title}`,
          publishedAt: new Date(item.pubDate || Date.now()),
          isTrending: true,
          trendingScore: Math.log(score + 1)
        } as any);
      });
    }
  }
  return articles;
}

async function fetchAppleTrending(): Promise<RawArticle[]> {
  try {
    const feed = await parser.parseURL('https://feeds.apple.news/top-stories.rss');
    return feed.items.slice(0, 5).map((item, i) => ({
      title: item.title || '',
      description: item.contentSnippet || '',
      url: item.link || '',
      source: 'Apple News',
      publishedAt: new Date(item.pubDate || Date.now()),
      isTrending: true,
      trendingScore: 10 - i
    } as any));
  } catch (e) {
    return [];
  }
}

async function fetchHNTrending(): Promise<RawArticle[]> {
  try {
    const topIdsRes = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json');
    const ids = topIdsRes.data.slice(0, 10);

    const stories = await Promise.allSettled(ids.map((id: number) =>
      axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
    ));

    const articles: RawArticle[] = [];
    for (const s of stories) {
      if (s.status === 'fulfilled' && s.value.data.url) {
        const item = s.value.data;
        articles.push({
          title: item.title,
          description: '',
          url: item.url,
          source: 'Hacker News',
          publishedAt: new Date(item.time * 1000),
          isTrending: true,
          trendingScore: Math.log(item.score + 1)
        } as any);
      }
    }
    return articles;
  } catch (e) {
    return [];
  }
}
