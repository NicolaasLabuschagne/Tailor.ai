import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const template = await prisma.newsletterTemplate.findUnique({
    where: { id: params.id }
  });

  return NextResponse.json(template);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Only delete templates that belong to the signed-in user's business
    const { count } = await prisma.newsletterTemplate.deleteMany({
      where: { id: params.id, businessProfile: { user: { email: session.user.email } } }
    });
    if (count === 0) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
