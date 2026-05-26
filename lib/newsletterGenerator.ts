import prisma from './prisma';
import { fetchNewsForBusiness } from './ingestion';
import { generateContent } from './gemini';

export async function generateNewsletter(jobId: string) {
  const job = await prisma.newsletterJob.findUnique({
    where: { id: jobId },
    include: {
      businessProfile: {
        include: { newsSource: true }
      }
    },
  });

  if (!job) throw new Error('Job not found');

  const articles = await fetchNewsForBusiness(job.businessProfile);

  const systemPrompt = `You are a professional newsletter copywriter. You write in the brand voice
of the business provided. Your job is to take real news articles and reframe
them to be relevant and valuable to the business's audience, while
naturally connecting the news to the business's products or services.
Always write as if you are the business owner speaking directly to their customers.
Return ONLY valid HTML suitable for email clients.`;

  const userPrompt = `Business: ${job.businessProfile.businessName}
Industry: ${job.businessProfile.industry}
Target audience: ${job.businessProfile.targetAudience}
Brand voice / tone: ${job.businessProfile.brandVoice} — ${job.businessProfile.tone}
Primary call to action: ${job.businessProfile.primaryCTA}
Current offers: ${job.businessProfile.currentOffers}
Products/services: ${job.businessProfile.productsServices}

${job.editNote ? `Client Feedback to address: ${job.editNote}` : ''}

Today's relevant news articles:
${articles.map(a => `- ${a.title}: ${a.description} (${a.source})`).join('\n')}

Write a newsletter with:
- A compelling subject line (return as <!-- SUBJECT: your subject here -->)
- A preview text snippet (return as <!-- PREVIEW: your preview here -->)
- Greeting section (warm, in brand voice)
- 2-3 news sections, each: headline → 2-sentence summary → 1-sentence
  bridge to the business → soft CTA
- A promotional section featuring current offers
- Sign-off in brand voice
- Unsubscribe link placeholder: {{UNSUBSCRIBE_LINK}}

Format as clean, inline-styled HTML compatible with Gmail and Outlook.`;

  const content = await generateContent(systemPrompt, userPrompt);

  const subjectMatch = content.match(/<!-- SUBJECT: (.*?) -->/);
  const previewMatch = content.match(/<!-- PREVIEW: (.*?) -->/);

  const subject = subjectMatch ? subjectMatch[1] : `Latest from ${job.businessProfile.businessName}`;
  const previewText = previewMatch ? previewMatch[1] : '';

  // Clean up markers from HTML
  const htmlContent = content
    .replace(/<!-- SUBJECT: .*? -->/, '')
    .replace(/<!-- PREVIEW: .*? -->/, '')
    .trim();

  await prisma.newsletterJob.update({
    where: { id: jobId },
    data: {
      status: 'AWAITING_APPROVAL',
      subject,
      previewText,
      htmlContent,
      logs: {
        create: {
          event: job.editNote ? 'REGENERATED' : 'GENERATED',
          message: job.editNote ? `Regenerated with note: ${job.editNote}` : 'Newsletter content generated successfully'
        }
      }
    },
  });

  return { subject, previewText, htmlContent };
}
