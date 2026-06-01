import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AVAILABLE_TOPICS } from '@/lib/topics';
import { generateBriefing } from '@/lib/briefingGenerator';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const { displayName, deliveryFrequency, deliveryTime, selectedTopics } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) return new NextResponse('User not found', { status: 404 });

    // Calculate next scheduledAt (for the SECOND briefing)
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

    // Create profile and topics first
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
        }
      }
    });

    // GENERATE AND SEND INITIAL BRIEFING INSTANTLY
    try {
      const briefingResult = await generateBriefing(profile.id);

      await resend.emails.send({
        from: 'Tailor <briefings@resend.dev>',
        to: session.user.email,
        subject: briefingResult.subject,
        html: briefingResult.htmlContent,
      });

      // Record it as SENT
      await prisma.briefing.create({
        data: {
          profileId: profile.id,
          status: 'SENT',
          scheduledAt: new Date(),
          sentAt: new Date(),
          subject: briefingResult.subject,
          htmlContent: briefingResult.htmlContent,
          logs: {
            create: { event: 'GENERATED', message: 'Initial catch-up briefing generated' }
          }
        }
      });

      await prisma.briefingLog.create({
        data: {
          briefingId: (await prisma.briefing.findFirst({ where: { profileId: profile.id }, orderBy: { createdAt: 'desc' } }))?.id || '',
          event: 'SENT',
          message: 'Initial briefing delivered'
        }
      });

    } catch (genError: any) {
      console.error('Failed to generate initial briefing:', genError);
      // We don't fail the whole onboarding if the initial briefing fails,
      // but we should probably record the failure.
    }

    // Schedule the NEXT one
    await prisma.briefing.create({
      data: {
        profileId: profile.id,
        status: 'PENDING',
        scheduledAt: nextScheduledAt,
      }
    });

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('Failed to create individual profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
