import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyUnsubscribeToken } from '@/lib/emailDelivery';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return new NextResponse('Missing token', { status: 400 });

  const subscriberId = verifyUnsubscribeToken(token);
  if (!subscriberId) return new NextResponse('Invalid or expired token', { status: 400 });

  try {
    const subscriber = await prisma.subscriber.findUnique({
      where: { id: subscriberId }
    });

    if (!subscriber) return new NextResponse('Subscriber not found', { status: 404 });

    if (subscriber.status === 'UNSUBSCRIBED') {
      return new NextResponse('You are already unsubscribed.', { status: 200 });
    }

    await prisma.subscriber.update({
      where: { id: subscriberId },
      data: { status: 'UNSUBSCRIBED' },
    });

    return new NextResponse('You have been successfully unsubscribed.', { status: 200 });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return new NextResponse('An error occurred while unsubscribing.', { status: 500 });
  }
}
