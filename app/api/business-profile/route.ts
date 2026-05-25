import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { keywords, categories, ...profileData } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const profile = await prisma.businessProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: { ...profileData, userId: user.id },
    });

    if (keywords) {
      await prisma.newsSource.upsert({
        where: { businessProfileId: profile.id },
        update: { keywords, categories: categories || [] },
        create: { businessProfileId: profile.id, keywords, categories: categories || [] },
      });
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('Profile update failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}
