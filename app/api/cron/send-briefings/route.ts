import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateBriefing } from '@/lib/briefingGenerator';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const now = new Date();
  const isMonday = now.getDay() === 1;

  // Query all IndividualProfiles that need a briefing
  const profiles = await prisma.individualProfile.findMany({
    where: {
      OR: [
        { deliveryFrequency: 'daily' },
        { AND: [{ deliveryFrequency: 'weekly' }, { id: { not: '' } }] } // Placeholder, logic below
      ],
      // We'll filter for Monday and scheduledAt in memory or with more complex SQL
    },
    include: {
      user: true,
      topics: true,
    },
  });

  const results = [];

  for (const profile of profiles) {
    try {
      // Check if it's the right day for weekly
      if (profile.deliveryFrequency === 'weekly' && !isMonday) continue;

      // Find pending briefing for this profile that is due
      const briefing = await prisma.briefing.findFirst({
        where: {
          profileId: profile.id,
          status: 'PENDING',
          scheduledAt: { lte: now },
        },
      });

      if (!briefing) continue;

      // Idempotency: set status to GENERATING
      const updatedBriefing = await prisma.briefing.update({
        where: { id: briefing.id },
        data: { status: 'GENERATING' },
      });

      // Log start
      await prisma.briefingLog.create({
        data: {
          briefingId: briefing.id,
          event: 'PROCESSING',
          message: 'Starting briefing generation',
        },
      });

      // Generate
      const result = await generateBriefing(profile.id);

      // Send via Resend
      await resend.emails.send({
        from: 'Tailor <briefings@resend.dev>',
        to: profile.user.email,
        subject: result.subject,
        html: result.htmlContent,
      });

      // Calculate next scheduled date
      let nextScheduledAt = new Date(now);
      const [hours, minutes] = profile.deliveryTime.split(':').map(Number);
      nextScheduledAt.setUTCHours(hours, minutes, 0, 0);

      if (profile.deliveryFrequency === 'daily') {
        nextScheduledAt.setUTCDate(nextScheduledAt.getUTCDate() + 1);
      } else {
        nextScheduledAt.setUTCDate(nextScheduledAt.getUTCDate() + 7);
      }

      // Update briefing status
      await prisma.briefing.update({
        where: { id: briefing.id },
        data: {
          status: 'SENT',
          sentAt: now,
          htmlContent: result.htmlContent,
          subject: result.subject,
        },
      });

      // Create next pending briefing
      await prisma.briefing.create({
        data: {
          profileId: profile.id,
          status: 'PENDING',
          scheduledAt: nextScheduledAt,
        },
      });

      // Log success
      await prisma.briefingLog.create({
        data: {
          briefingId: briefing.id,
          event: 'SENT',
          message: `Briefing sent to ${profile.user.email}`,
        },
      });

      results.push({ profileId: profile.id, status: 'success' });
    } catch (error: any) {
      console.error(`Failed to process briefing for profile ${profile.id}:`, error);

      // Find the briefing again to log failure (might have failed before update)
      const briefing = await prisma.briefing.findFirst({
        where: { profileId: profile.id, status: 'GENERATING' }
      });

      if (briefing) {
        await prisma.briefing.update({
          where: { id: briefing.id },
          data: { status: 'FAILED' },
        });

        await prisma.briefingLog.create({
          data: {
            briefingId: briefing.id,
            event: 'FAILED',
            message: error.message || 'Unknown error during briefing generation/delivery',
          },
        });
      }

      results.push({ profileId: profile.id, status: 'failed', error: error.message });
    }
  }

  return NextResponse.json({ processed: results.length, details: results });
}
