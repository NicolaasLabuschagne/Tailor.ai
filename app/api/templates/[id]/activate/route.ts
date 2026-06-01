import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const template = await prisma.newsletterTemplate.findUnique({
      where: { id: params.id }
    });

    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    await prisma.newsletterTemplate.updateMany({
      where: { businessProfileId: template.businessProfileId },
      data: { isActive: false }
    });

    const updated = await prisma.newsletterTemplate.update({
      where: { id: params.id },
      data: { isActive: true }
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
