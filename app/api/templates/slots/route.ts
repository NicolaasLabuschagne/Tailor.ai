import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await prisma.businessProfile.findFirst({
    where: { user: { email: session.user.email } },
    include: { templateSlots: { orderBy: { createdAt: 'desc' } } }
  });

  return NextResponse.json(profile?.templateSlots || []);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slotId } = await req.json();

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { businessProfile: true }
    });

    if (!user?.businessProfile) return NextResponse.json({ error: 'Profile missing' }, { status: 404 });

    const slot = await prisma.templateSlot.findUnique({ where: { id: slotId } });
    if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 });

    // Mark as active
    await prisma.businessProfile.update({
      where: { id: user.businessProfile.id },
      data: {
        activeTemplateSource: slot.source === 'AI_GENERATED' ? 'pasted' : 'unlayer',
        pastedTemplateHtml: slot.html,
        pastedTemplateMap: JSON.stringify({
           headline: 'h1',
           paragraph1: 'p',
           paragraph2: 'p:nth-of-type(2)',
           paragraph3: 'p:nth-of-type(3)',
           offerText: 'div',
           ctaLabel: 'a',
           ctaHref: 'a',
           topicLabel: 'span'
        })
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Selection failed' }, { status: 500 });
  }
}
