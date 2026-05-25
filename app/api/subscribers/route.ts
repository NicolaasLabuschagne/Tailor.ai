import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email, firstName, tags } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { businessProfile: true }
    });

    if (!user?.businessProfile) {
      return NextResponse.json({ error: 'Business profile not found' }, { status: 404 });
    }

    const subscriber = await prisma.subscriber.create({
      data: {
        businessProfileId: user.businessProfile.id,
        email,
        firstName,
        tags,
      },
    });

    return NextResponse.json(subscriber);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add subscriber' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { businessProfile: true }
  });

  if (!user?.businessProfile) {
    return NextResponse.json([]);
  }

  const subscribers = await prisma.subscriber.findMany({
    where: { businessProfileId: user.businessProfile.id },
  });

  return NextResponse.json(subscribers);
}
