import { Resend } from 'resend';
import prisma from './prisma';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);
const BATCH_SIZE = 50;
const TOKEN_EXPIRY_DAYS = 31;

export async function sendNewsletter(jobId: string) {
  const job = await prisma.newsletterJob.findUnique({
    where: { id: jobId },
    include: { businessProfile: true },
  });

  if (!job || !job.htmlContent || !job.subject) {
    throw new Error('Job not found or missing content');
  }

  // Idempotency check
  if (job.status === 'SENT') return [];
  if (job.status === 'FAILED') return [];

  // Lock job
  await prisma.newsletterJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING' }
  });

  try {
    const subscribers = await prisma.subscriber.findMany({
      where: {
        businessProfileId: job.businessProfileId,
        status: 'ACTIVE',
      },
      take: BATCH_SIZE,
      skip: job.sentCount,
    });

    if (subscribers.length === 0) {
      await prisma.newsletterJob.update({
        where: { id: jobId },
        data: { status: 'SENT', sentAt: new Date() }
      });
      return [];
    }

    const results = await Promise.all(
      subscribers.map(async (subscriber) => {
        const token = generateSignedToken(subscriber.id);
        const unsubscribeUrl = `${process.env.NEXTAUTH_URL}/api/unsubscribe?token=${token}`;

        const html = job.htmlContent!.replace('{{UNSUBSCRIBE_LINK}}', unsubscribeUrl);

        try {
          await resend.emails.send({
            from: `${job.businessProfile.businessName} <newsletters@resend.dev>`,
            to: subscriber.email,
            subject: job.subject!,
            html: html,
          });
          return { success: true, subscriberId: subscriber.id };
        } catch (error: any) {
          console.error(`Failed to send to ${subscriber.email}:`, error);
          if (error.status === 429) {
             throw new Error('Rate limit exceeded');
          }
          return { success: false, subscriberId: subscriber.id, error };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const newSentCount = job.sentCount + subscribers.length;

    // Check if we are done or need another batch
    const totalSubscribers = await prisma.subscriber.count({
      where: { businessProfileId: job.businessProfileId, status: 'ACTIVE' }
    });

    await prisma.newsletterJob.update({
      where: { id: jobId },
      data: {
        sentCount: { increment: successCount },
        totalRecipients: totalSubscribers,
        status: newSentCount >= totalSubscribers ? 'SENT' : 'APPROVED',
        sentAt: newSentCount >= totalSubscribers ? new Date() : null
      },
    });

    return results;
  } catch (error: any) {
    console.error(`Batch processing failed for job ${jobId}:`, error);
    await prisma.newsletterJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: error.message || 'Unknown error during batch sending'
      }
    });
    throw error;
  }
}

function generateSignedToken(subscriberId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'secret';
  const expiresAt = Date.now() + (TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const data = `${subscriberId}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return Buffer.from(JSON.stringify({ subscriberId, expiresAt, signature })).toString('base64');
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const { subscriberId, expiresAt, signature } = JSON.parse(Buffer.from(token, 'base64').toString());
    const secret = process.env.NEXTAUTH_SECRET || 'secret';
    const data = `${subscriberId}:${expiresAt}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('hex');

    if (signature !== expectedSignature) return null;
    if (Date.now() > expiresAt) return null;

    return subscriberId;
  } catch (e) {
    return null;
  }
}
