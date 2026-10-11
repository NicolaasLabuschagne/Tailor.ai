import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getBusinessProfileForEmail } from '@/lib/newsletter/catalog';

async function ownedLayout(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const profile = await getBusinessProfileForEmail(session.user.email);
  const layout = profile && (await prisma.newsletterLayout.findFirst({ where: { id, businessProfileId: profile.id } }));
  if (!profile || !layout) return { error: NextResponse.json({ error: 'Layout not found' }, { status: 404 }) };

  return { profile, layout };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error, layout } = await ownedLayout(params.id);
  if (error) return error;

  const body = await req.json();
  const data: { name?: string; isFavorite?: boolean } = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 60);
  if (typeof body.isFavorite === 'boolean') data.isFavorite = body.isFavorite;

  // Keep the stored design's name in sync with a rename
  const designJson = data.name ? JSON.stringify({ ...JSON.parse(layout!.designJson), name: data.name }) : undefined;

  const updated = await prisma.newsletterLayout.update({
    where: { id: params.id },
    data: { ...data, ...(designJson ? { designJson } : {}) },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error, profile } = await ownedLayout(params.id);
  if (error) return error;

  await prisma.newsletterLayout.delete({ where: { id: params.id } });
  if (profile!.defaultLayoutId === params.id) {
    await prisma.businessProfile.update({ where: { id: profile!.id }, data: { defaultLayoutId: null } });
  }
  return NextResponse.json({ success: true });
}
