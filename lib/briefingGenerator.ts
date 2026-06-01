import prisma from './prisma';
import { fetchNewsForTopic } from './ingestion';
import { generateContent } from './groq';

export async function generateBriefing(profileId: string) {
  const profile = await prisma.individualProfile.findUnique({
    where: { id: profileId },
    include: { topics: true },
  });

  if (!profile) throw new Error('Profile not found');

  // Determine lookback window
  const hours = profile.deliveryFrequency === 'daily' ? 24 : 168;

  const allArticles = [];
  for (const topic of profile.topics) {
    const articles = await fetchNewsForTopic(topic, hours);
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
  2. A brief executive summary (2-3 sentences) of the overall landscape. Wrap in <p style="margin-bottom: 16px;">.
  3. Sectioned news updates by topic.
     - Use <h2 style="color: #4a5568; font-size: 18px; font-weight: 600; margin-top: 32px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em;">Topic Name</h2>
     - For each article: <div style="margin-bottom: 24px;"><span style="font-weight: 600; color: #2d3748; display: block; margin-bottom: 4px;">Headline</span><span style="color: #718096; font-size: 14px; font-style: italic;">Why it matters: impact summary.</span></div>
  4. A "Deep Dive" recommendation:
     - Use <div style="background-color: #ebf8ff; border-left: 4px solid #3182ce; padding: 20px; margin-top: 40px;"><h3>Deep Dive: Headline</h3><p>Detailed summary.</p></div>

  Format all HTML with INLINE styles only. Do not use <style> blocks.`;

  const content = await generateContent(systemPrompt, userPrompt);

  const subjectMatch = content.match(/<!-- SUBJECT: (.*?) -->/);
  const subject = subjectMatch ? subjectMatch[1] : `Your Executive Briefing - ${new Date().toLocaleDateString()}`;

  const mainContent = content.replace(/<!-- SUBJECT: .*? -->/, '').trim();

  const finalHtml = `
<!DOCTYPE html>
<html>
  <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a202c; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7fafc;">
    <div style="background-color: #ffffff; padding: 40px; border-radius: 8px;">
      <h1 style="color: #2d3748; font-size: 24px; font-weight: 700; margin-bottom: 24px; border-bottom: 2px solid #edf2f7; padding-bottom: 12px;">
        Executive Briefing for ${profile.displayName}
      </h1>
      ${mainContent}
      <div style="margin-top: 48px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 24px;">
        Relayed by Tailor Personal Briefings. Manage your topics in your dashboard.
      </div>
    </div>
  </body>
</html>`;

  return { subject, htmlContent: finalHtml };
}
