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

  const [rssResults, newsapiResults, guardianResults, nytResults] =
    await Promise.allSettled([
      fetchRSS(GENERAL_US_FEEDS, keywords),
      fetchNewsAPI({ keywords, language: "en", country: "us" }),
      fetchGuardian(keywords),
      fetchNYT(keywords),
    ]);

  const all = [
    ...(rssResults.status === "fulfilled" ? rssResults.value : []),
    ...(newsapiResults.status === "fulfilled" ? newsapiResults.value : []),
    ...(guardianResults.status === "fulfilled" ? guardianResults.value : []),
    ...(nytResults.status === "fulfilled" ? nytResults.value : []),
  ];

  return filterAndRank(all, keywords, 5);
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
