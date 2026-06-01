import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await prisma.businessProfile.findFirst({
    where: { user: { email: session.user.email } },
    include: { templates: { orderBy: { slotNumber: 'asc' } } }
  });

  return NextResponse.json(profile?.templates || []);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { businessProfile: true }
    });

    if (!user?.businessProfile) return NextResponse.json({ error: 'Profile missing' }, { status: 404 });

    const template = await prisma.newsletterTemplate.upsert({
      where: {
        businessProfileId_slotNumber: {
          businessProfileId: user.businessProfile.id,
          slotNumber: data.slotNumber || 1
        }
      },
      update: {
        name: data.name,
        templateHtml: data.templateHtml,
        templateJson: data.templateJson,
        contentMap: data.contentMap,
        source: data.source,
        thumbnail: data.thumbnail
      },
      create: {
        businessProfileId: user.businessProfile.id,
        slotNumber: data.slotNumber || 1,
        name: data.name || "New Template",
        templateHtml: data.templateHtml,
        templateJson: data.templateJson,
        contentMap: data.contentMap,
        source: data.source || 'CUSTOM',
        thumbnail: data.thumbnail
      }
    });

    return NextResponse.json(template);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
