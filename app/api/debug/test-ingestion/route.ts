import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { fetchNewsForBusiness } from '@/lib/ingestion';
import { expandKeywords } from '@/lib/ingestion/filter';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        businessProfile: {
          include: { newsSource: true }
        }
      }
    });

    if (!user?.businessProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const articles = await fetchNewsForBusiness(user.businessProfile);
    const keywords = user.businessProfile.newsSource?.keywords || [];
    const expanded = expandKeywords(keywords);

    // Grouping by source for diagnostic
    const sources = {
       rss: articles.filter(a => a.source !== 'The Guardian' && a.source !== 'NewsAPI' && a.source !== 'The New York Times').length,
       guardian: articles.filter(a => a.source === 'The Guardian').length,
       newsapi: articles.filter(a => a.source === 'NewsAPI').length,
    };

    return NextResponse.json({
      articlesFound: articles.length,
      sources,
      topArticles: articles.slice(0, 3).map(a => ({
        title: a.title,
        source: a.source,
        publishedAt: a.publishedAt
      })),
      expandedKeywords: expanded
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
