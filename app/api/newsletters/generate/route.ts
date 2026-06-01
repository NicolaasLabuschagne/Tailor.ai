import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateNewsletter } from '@/lib/newsletterGenerator';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let jobId, editNote;
    try {
      const body = await req.json();
      jobId = body.jobId;
      editNote = body.editNote;
    } catch (e) {
      // Fallback for form submissions
    }

    if (jobId) {
      // Regenerate existing job
      if (editNote) {
        await prisma.newsletterJob.update({
          where: { id: jobId },
          data: { editNote, status: 'GENERATING' }
        });
      }
      await generateNewsletter(jobId);
      return NextResponse.redirect(new URL('/dashboard/newsletters', req.url));
    } else {
      // Create new job
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { businessProfile: true }
      });

      if (!user?.businessProfile) {
        return NextResponse.json({ error: 'Business profile not found' }, { status: 404 });
      }

      const job = await prisma.newsletterJob.create({
        data: {
          businessProfileId: user.businessProfile.id,
          status: 'GENERATING',
        }
      });

      await generateNewsletter(job.id);
      return NextResponse.redirect(new URL('/dashboard/newsletters', req.url));
    }
  } catch (error: any) {
    console.error('Generation failed:', error);
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}
