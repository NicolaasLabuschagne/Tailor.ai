import { BusinessProfile, NewsSource, Topic } from '@prisma/client';
import { RawArticle } from './types';
import { fetchRSS, GENERAL_US_FEEDS, TOPIC_FEEDS } from './sources/rss';
import { fetchNewsAPI } from './sources/newsapi';
import { fetchGuardian } from './sources/guardian';
import { fetchNYT } from './sources/nyt';
import { filterAndRank } from './filter';

export async function fetchNewsForBusiness(
  profile: BusinessProfile & { newsSource: NewsSource | null }
): Promise<RawArticle[]> {
  const keywords = profile.newsSource?.keywords || [];

  // Try with 24h window first
  const recent = await fetchNewsFromAllSources(keywords, 24);
  const filteredRecent = filterAndRank(recent, keywords, 5);

  if (filteredRecent.length >= 3) {
    return filteredRecent;
  }

  // Not enough fresh content — widen to 72h window
  console.log(`Only ${filteredRecent.length} articles in 24h — extending to 72h window for ${profile.businessName}`);
  const fallback = await fetchNewsFromAllSources(keywords, 72);
  return filterAndRank(fallback, keywords, 5);
}

async function fetchNewsFromAllSources(keywords: string[], hours: number): Promise<RawArticle[]> {
  const [rssResults, newsapiResults, guardianResults, nytResults] =
    await Promise.allSettled([
      fetchRSS(GENERAL_US_FEEDS, keywords, hours),
      fetchNewsAPI({ keywords, language: "en", country: "us" }), // NewsAPI doesn't easily support dynamic hours but defaults to recent
      fetchGuardian(keywords, hours),
      fetchNYT(keywords), // NYT doesn't easily support dynamic hours but returns recent
    ]);

  return [
    ...(rssResults.status === "fulfilled" ? rssResults.value : []),
    ...(newsapiResults.status === "fulfilled" ? newsapiResults.value : []),
    ...(guardianResults.status === "fulfilled" ? guardianResults.value : []),
    ...(nytResults.status === "fulfilled" ? nytResults.value : []),
  ];
}

export async function fetchNewsForTopic(
  topic: Topic
): Promise<RawArticle[]> {
  const feeds = TOPIC_FEEDS[topic.slug] ?? GENERAL_US_FEEDS;

  const [rssResults, guardianResults, nytResults] =
    await Promise.allSettled([
      fetchRSS(feeds, topic.keywords),
      fetchGuardian(topic.keywords),
      fetchNYT(topic.keywords),
    ]);

  const all = [
    ...(rssResults.status === "fulfilled" ? rssResults.value : []),
    ...(guardianResults.status === "fulfilled" ? guardianResults.value : []),
    ...(nytResults.status === "fulfilled" ? nytResults.value : []),
  ];

  return filterAndRank(all, topic.keywords, 3);
}
