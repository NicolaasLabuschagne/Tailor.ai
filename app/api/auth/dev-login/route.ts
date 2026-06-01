import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not allowed in production', { status: 403 });
  }

  const user = await prisma.user.upsert({
    where: { email: 'dev@example.com' },
    update: {},
    create: {
      email: 'dev@example.com',
      name: 'Dev User',
    },
  });

  return NextResponse.json({ message: 'Dev user ensured. Please use this email to sign in via magic link (mocked in terminal).', user });
}
