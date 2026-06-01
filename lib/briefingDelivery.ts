import { Resend } from 'resend';
import prisma from './prisma';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBriefing(briefingId: string) {
  // Briefings don't have a PROCESSING status in schema,
  // they use PENDING -> GENERATING -> READY -> SENT

  const briefing = await prisma.briefing.findUnique({
    where: { id: briefingId },
    include: { profile: { include: { user: true } } }
  });

  if (!briefing || briefing.status === 'SENT' || !briefing.htmlContent || !briefing.subject) {
    return;
  }

  try {
    await resend.emails.send({
      from: 'Tailor Briefings <briefings@resend.dev>',
      to: briefing.profile.user.email,
      subject: briefing.subject,
      html: briefing.htmlContent,
    });

    await prisma.briefing.update({
      where: { id: briefingId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        logs: { create: { event: 'SENT', message: 'Briefing delivered successfully' } }
      }
    });
  } catch (error: any) {
    console.error('Briefing delivery failed:', error);
    await prisma.briefing.update({
      where: { id: briefingId },
      data: {
        status: 'FAILED',
        logs: { create: { event: 'FAILED', message: error.message || 'Delivery failed' } }
      }
    });
  }
}
