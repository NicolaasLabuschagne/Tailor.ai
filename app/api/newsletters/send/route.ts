import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendNewsletter } from '@/lib/emailDelivery';

export async function POST(req: Request) {
  const { jobId } = await req.json();

  try {
    const results = await sendNewsletter(jobId);
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Send failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
