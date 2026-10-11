import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBusinessProfileForEmail } from '@/lib/newsletter/catalog';
import { applyLayout, redesignNewsletter } from '@/lib/newsletterGenerator';

// Body: { layoutId } to switch to a catalog layout, or { redesign: true } for a fresh AI design.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await getBusinessProfileForEmail(session.user.email);
  if (!profile) {
    return NextResponse.json({ error: 'Business profile not found' }, { status: 404 });
  }

  const body = await req.json();

  try {
    const job = body.redesign
      ? await redesignNewsletter(params.id, profile.id)
      : await applyLayout(params.id, profile.id, String(body.layoutId ?? ''));
    return NextResponse.json(job);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to change layout' }, { status: 400 });
  }
}
