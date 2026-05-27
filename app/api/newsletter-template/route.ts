import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { businessProfile: true }
    });

    if (!user?.businessProfile) return NextResponse.json({ error: 'Business profile not found' }, { status: 404 });

    const template = await prisma.newsletterTemplate.upsert({
      where: { businessProfileId: user.businessProfile.id },
      update: data,
      create: { ...data, businessProfileId: user.businessProfile.id },
    });

    return NextResponse.json(template);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
