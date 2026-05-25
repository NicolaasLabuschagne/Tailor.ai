import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendNewsletter } from '@/lib/emailDelivery';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // 1. Stuck Jobs Check
    const stuckJobs = await prisma.newsletterJob.findMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lte: thirtyMinutesAgo }
      }
    });

    for (const job of stuckJobs) {
      await prisma.newsletterJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: 'Timed out in PROCESSING — manual review required'
        }
      });
      console.warn(`Job ${job.id} marked as FAILED due to timeout in PROCESSING`);
    }

    // 2. Fetch approved jobs due for sending
    const approvedJobs = await prisma.newsletterJob.findMany({
      where: {
        status: 'APPROVED',
        scheduledAt: { lte: now }
      }
    });

    const results = [];
    for (const job of approvedJobs) {
      try {
        const result = await sendNewsletter(job.id);
        results.push({ jobId: job.id, success: true, details: result });
      } catch (err: any) {
        results.push({ jobId: job.id, success: false, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      stuckCleaned: stuckJobs.length,
      details: results
    });
  } catch (error: any) {
    console.error('Newsletter cron failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
