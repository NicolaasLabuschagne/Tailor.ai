import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const status = {
    database: 'unknown',
    gemini: 'unknown',
    newsapi: 'unknown',
    resend: 'unknown',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = 'connected';
  } catch (err) {
    status.database = 'error';
  }

  try {
    if (!process.env.GEMINI_API_KEY) throw new Error();
    status.gemini = 'configured';
  } catch (err) {
    status.gemini = 'not configured';
  }

  try {
    if (!process.env.NEWSAPI_KEY) throw new Error();
    status.newsapi = 'configured';
  } catch (err) {
    status.newsapi = 'not configured';
  }

  try {
    if (!process.env.RESEND_API_KEY) throw new Error();
    status.resend = 'configured';
  } catch (err) {
    status.resend = 'not configured';
  }

  return NextResponse.json(status);
}
