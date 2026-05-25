import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { jobId, scheduledAt } = await req.json();

  try {
    const job = await prisma.newsletterJob.update({
      where: { id: jobId },
      data: {
        status: 'APPROVED',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      },
    });

    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json({ error: 'Approval failed' }, { status: 500 });
  }
}
