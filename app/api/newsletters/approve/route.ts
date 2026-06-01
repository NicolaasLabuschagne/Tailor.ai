import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId, scheduledAt } = await req.json();

  if (!scheduledAt) {
    return NextResponse.json({ error: 'Schedule time is required' }, { status: 400 });
  }

  const scheduleDate = new Date(scheduledAt);
  if (scheduleDate < new Date()) {
    return NextResponse.json({ error: 'Schedule time cannot be in the past' }, { status: 400 });
  }

  try {
    const job = await prisma.newsletterJob.update({
      where: { id: jobId },
      data: {
        status: 'APPROVED',
        scheduledAt: scheduleDate,
        logs: {
          create: {
            event: 'APPROVED',
            message: `Newsletter approved and scheduled for ${scheduleDate.toLocaleString()}`
          }
        }
      },
    });

    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json({ error: 'Approval failed' }, { status: 500 });
  }
}
