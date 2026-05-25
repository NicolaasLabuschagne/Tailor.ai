import Anthropic from '@anthropic-ai/sdk';
import prisma from './prisma';
import { fetchNewsForTopic } from './ingestion';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateBriefing(profileId: string) {
  const profile = await prisma.individualProfile.findUnique({
    where: { id: profileId },
    include: { topics: true },
  });

  if (!profile) throw new Error('Profile not found');

  const allArticles = [];
  for (const topic of profile.topics) {
    const articles = await fetchNewsForTopic(topic);
    allArticles.push(...articles.map(a => ({ ...a, topic: topic.label })));
  }

  const systemPrompt = `You are an elite executive assistant. Your job is to create a concise, intelligent personal news briefing.
Write in a professional, executive tone.
Format the output as clean HTML suitable for email.
Include only the HTML body content.`;

  const userPrompt = `Recipient: ${profile.displayName}
Date: ${new Date().toLocaleDateString()}

Topics of Interest: ${profile.topics.map(t => t.label).join(', ')}

News Articles:
${allArticles.map(a => `- [${a.topic}] ${a.title}: ${a.description} (${a.source})`).join('\n')}

Please write a briefing that includes:
1. A smart, personalized subject line (return as <!-- SUBJECT: your subject here -->)
2. A brief executive summary (2-3 sentences) of the overall landscape.
3. Sectioned news updates by topic. Each update should be 1-2 sentences focusing on WHY this matters.
4. A "Deep Dive" recommendation: pick one article and provide a slightly more detailed 3-sentence summary.

Use this EXACT HTML/CSS template structure:
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a202c; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7fafc; }
      .container { background-color: #ffffff; padding: 40px; border-radius: 8px; shadow: 0 4px 6px rgba(0,0,0,0.1); }
      h1 { color: #2d3748; font-size: 24px; font-weight: 700; margin-bottom: 24px; border-bottom: 2px solid #edf2f7; padding-bottom: 12px; }
      h2 { color: #4a5568; font-size: 18px; font-weight: 600; margin-top: 32px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
      p { margin-bottom: 16px; }
      .topic-section { margin-bottom: 32px; }
      .article-headline { font-weight: 600; color: #2d3748; display: block; margin-bottom: 4px; }
      .article-impact { color: #718096; font-size: 14px; font-style: italic; }
      .deep-dive { background-color: #ebf8ff; border-left: 4px solid #3182ce; padding: 20px; margin-top: 40px; }
      .footer { margin-top: 48px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 24px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Executive Briefing for ${profile.displayName}</h1>
      <!-- INSERT CONTENT HERE -->
      <div class="footer">
        Relayed by Tailor Personal Briefings. Manage your topics in your dashboard.
      </div>
    </div>
  </body>
</html>`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const content = message.content[0].type === 'text' ? message.content[0].text : '';

  const subjectMatch = content.match(/<!-- SUBJECT: (.*?) -->/);
  const subject = subjectMatch ? subjectMatch[1] : `Your Executive Briefing - ${new Date().toLocaleDateString()}`;

  // Extract only the body content if AI returned the whole thing, or just the part between comments
  // In reality, we want the AI to fill the template. We'll wrap its content in the template here.
  const mainContent = content.replace(/<!-- SUBJECT: .*? -->/, '').trim();

  const finalHtml = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a202c; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7fafc; }
      .container { background-color: #ffffff; padding: 40px; border-radius: 8px; }
      h1 { color: #2d3748; font-size: 24px; font-weight: 700; margin-bottom: 24px; border-bottom: 2px solid #edf2f7; padding-bottom: 12px; }
      h2 { color: #4a5568; font-size: 18px; font-weight: 600; margin-top: 32px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
      p { margin-bottom: 16px; }
      .topic-section { margin-bottom: 32px; }
      .article-headline { font-weight: 600; color: #2d3748; display: block; margin-bottom: 4px; }
      .article-impact { color: #718096; font-size: 14px; font-style: italic; }
      .deep-dive { background-color: #ebf8ff; border-left: 4px solid #3182ce; padding: 20px; margin-top: 40px; }
      .footer { margin-top: 48px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 24px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Executive Briefing for ${profile.displayName}</h1>
      ${mainContent}
      <div class="footer">
        Relayed by Tailor Personal Briefings. Manage your topics in your dashboard.
      </div>
    </div>
  </body>
</html>`;

  return { subject, htmlContent: finalHtml };
}
