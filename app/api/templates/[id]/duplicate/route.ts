import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const original = await prisma.newsletterTemplate.findUnique({
      where: { id: params.id }
    });

    if (!original) return NextResponse.json({ error: 'Original template not found' }, { status: 404 });

    const slots = await prisma.newsletterTemplate.findMany({
      where: { businessProfileId: original.businessProfileId },
      select: { slotNumber: true }
    });

    const usedSlots = slots.map(s => s.slotNumber);
    let targetSlot = -1;
    for (let i = 1; i <= 5; i++) {
      if (!usedSlots.includes(i)) {
        targetSlot = i;
        break;
      }
    }

    if (targetSlot === -1) return NextResponse.json({ error: 'No empty slots available' }, { status: 400 });

    const copy = await prisma.newsletterTemplate.create({
      data: {
        businessProfileId: original.businessProfileId,
        slotNumber: targetSlot,
        name: "Copy of " + original.name,
        source: original.source,
        templateHtml: original.templateHtml,
        templateJson: original.templateJson,
        contentMap: original.contentMap,
        thumbnail: original.thumbnail,
        isActive: false
      }
    });

    return NextResponse.json(copy);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
