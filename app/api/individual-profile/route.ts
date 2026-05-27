import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AVAILABLE_TOPICS } from '@/lib/topics';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const { displayName, deliveryFrequency, deliveryTime, selectedTopics } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) return new NextResponse('User not found', { status: 404 });

    // Calculate next scheduledAt
    let nextScheduledAt = new Date();
    const [hours, minutes] = deliveryTime.split(':').map(Number);
    nextScheduledAt.setUTCHours(hours, minutes, 0, 0);

    if (nextScheduledAt <= new Date()) {
      if (deliveryFrequency === 'daily') {
        nextScheduledAt.setUTCDate(nextScheduledAt.getUTCDate() + 1);
      } else {
        // Find next Monday
        const daysUntilMonday = (8 - nextScheduledAt.getUTCDay()) % 7 || 7;
        nextScheduledAt.setUTCDate(nextScheduledAt.getUTCDate() + daysUntilMonday);
      }
    } else if (deliveryFrequency === 'weekly' && nextScheduledAt.getUTCDay() !== 1) {
        const daysUntilMonday = (8 - nextScheduledAt.getUTCDay()) % 7 || 7;
        nextScheduledAt.setUTCDate(nextScheduledAt.getUTCDate() + daysUntilMonday);
    }

    const profile = await prisma.individualProfile.create({
      data: {
        userId: user.id,
        displayName,
        deliveryFrequency: deliveryFrequency,
        deliveryTime: deliveryTime,
        topics: {
          create: selectedTopics.map((slug: string) => {
            const topic = AVAILABLE_TOPICS.find(t => t.slug === slug);
            return {
              slug,
              label: topic?.label || slug,
              keywords: topic?.keywords || [],
            };
          })
        },
        briefings: {
          create: {
            status: 'PENDING',
            scheduledAt: nextScheduledAt,
          }
        }
      }
    });

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('Failed to create individual profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
