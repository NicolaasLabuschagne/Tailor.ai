import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { effectiveDefaultLayoutId, getBrand, getBusinessProfileForEmail, listCatalog } from '@/lib/newsletter/catalog';
import { SAMPLE_CONTENT } from '@/lib/newsletter/render';

// Catalog of built-in + saved layouts, plus what's needed to render previews client-side.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await getBusinessProfileForEmail(session.user.email);
  if (!profile) {
    return NextResponse.json({ error: 'Business profile not found' }, { status: 404 });
  }

  // Preview with a specific issue's content when asked, else the latest issue, else sample copy
  const jobId = new URL(req.url).searchParams.get('jobId');
  const job = await prisma.newsletterJob.findFirst({
    where: { businessProfileId: profile.id, contentJson: { not: null }, ...(jobId ? { id: jobId } : {}) },
    orderBy: { createdAt: 'desc' },
    select: { contentJson: true },
  });

  const brand = await getBrand(profile);
  const layouts = await listCatalog(profile.id, brand);

  return NextResponse.json({
    layouts,
    brand,
    defaultLayoutId: await effectiveDefaultLayoutId(profile),
    previewContent: job?.contentJson ? JSON.parse(job.contentJson) : SAMPLE_CONTENT,
  });
}
