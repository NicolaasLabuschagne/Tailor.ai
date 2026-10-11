import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { TemplateSource } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getBrand, getBusinessProfileForEmail, resolveLayout } from '@/lib/newsletter/catalog';
import { TEMPLATE_PREFIX } from '@/lib/newsletter/types';

// Templates with their own HTML override catalog layouts when active
const HTML_TEMPLATE_SOURCES: TemplateSource[] = ['UNLAYER', 'PASTED', 'AI_GENERATED'];

// Set what new issues use. One source of truth:
//   "template:<id>" activates that template (like the Activate button in My Templates);
//   any other layout deactivates HTML templates so it actually applies;
//   null hands design back to the AI art director.
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await getBusinessProfileForEmail(session.user.email);
  if (!profile) {
    return NextResponse.json({ error: 'Business profile not found' }, { status: 404 });
  }

  const { layoutId } = await req.json();

  if (typeof layoutId === 'string' && layoutId.startsWith(TEMPLATE_PREFIX)) {
    const templateId = layoutId.slice(TEMPLATE_PREFIX.length);
    const template = await prisma.newsletterTemplate.findFirst({ where: { id: templateId, businessProfileId: profile.id } });
    if (!template?.templateHtml) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    await prisma.$transaction([
      prisma.newsletterTemplate.updateMany({ where: { businessProfileId: profile.id }, data: { isActive: false } }),
      prisma.newsletterTemplate.update({ where: { id: templateId }, data: { isActive: true } }),
      prisma.businessProfile.update({ where: { id: profile.id }, data: { defaultLayoutId: null } }),
    ]);
    return NextResponse.json({ defaultLayoutId: layoutId });
  }

  if (layoutId !== null) {
    if (typeof layoutId !== 'string' || !(await resolveLayout(layoutId, profile.id, await getBrand(profile)))) {
      return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
    }
  }

  await prisma.$transaction([
    prisma.newsletterTemplate.updateMany({
      where: { businessProfileId: profile.id, isActive: true, source: { in: HTML_TEMPLATE_SOURCES } },
      data: { isActive: false },
    }),
    prisma.businessProfile.update({ where: { id: profile.id }, data: { defaultLayoutId: layoutId } }),
  ]);
  return NextResponse.json({ defaultLayoutId: layoutId });
}
