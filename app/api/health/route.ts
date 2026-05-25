import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Anthropic } from '@anthropic-ai/sdk';
import { Resend } from 'resend';

export async function GET() {
  const status: Record<string, string> = {
    database: 'unknown',
    anthropic: 'unknown',
    newsapi: 'unknown',
    resend: 'unknown',
  };

  // Check Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = 'connected';
  } catch (e) {
    status.database = 'error';
  }

  // Check Anthropic
  try {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error();
    status.anthropic = 'configured';
  } catch (e) {
    status.anthropic = 'not configured';
  }

  // Check NewsAPI
  try {
    if (!process.env.NEWSAPI_KEY) throw new Error();
    status.newsapi = 'configured';
  } catch (e) {
    status.newsapi = 'not configured';
  }

  // Check Resend
  try {
    if (!process.env.RESEND_API_KEY) throw new Error();
    status.resend = 'configured';
  } catch (e) {
    status.resend = 'not configured';
  }

  return NextResponse.json(status);
}
