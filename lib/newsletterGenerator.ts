import prisma from './prisma';
import { fetchNewsForBusiness } from './ingestion';
import { generateContent } from './groq';

export async function generateNewsletter(jobId: string) {
  const job = await prisma.newsletterJob.findUnique({
    where: { id: jobId },
    include: {
      businessProfile: {
        include: { newsSource: true, user: true, template: true }
      }
    },
  });

  if (!job) throw new Error('Job not found');

  const articles = await fetchNewsForBusiness(job.businessProfile);

  const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const industryShortLabel = job.businessProfile.industry.split(' ')[0] || job.businessProfile.industry;
  const ctaUrl = job.businessProfile.websiteUrl || '[your website link]';
  const template = job.businessProfile.template || {
    primaryColor: '#1a1a1a',
    secondaryColor: '#ffffff',
    fontHeader: 'Arial, sans-serif',
    fontBody: 'Georgia, Times New Roman, serif',
    logoUrl: null
  };

  const systemPromptTemplate = `You are a professional newsletter copywriter. You write in the brand voice
of the business provided. Your job is to take real news articles and reframe
them to be relevant and valuable to the business's audience, while
naturally connecting the news to the business's products or services.
Always write as if you are the business owner speaking directly to their customers.

Output only valid HTML using these exact inline
styles. Do not invent your own design. Structure:

<div style='max-width:560px;margin:0 auto;
  background:${template.secondaryColor};font-family:${template.fontBody}'>

  <!-- HEADER -->
  <div style='background:${template.primaryColor};padding:
    24px 32px;text-align:center'>
    ${template.logoUrl ? `<img src="${template.logoUrl}" style="height:32px;margin-bottom:8px">` : ''}
    <p style='margin:0 0 4px;font-family:${template.fontHeader};font-size:10px;font-weight:700;
      letter-spacing:.15em;color:#888;
      text-transform:uppercase'>
      {businessName}
    </p>
    <p style='margin:0;font-size:11px;
      font-family:${template.fontHeader};color:#555'>
      {newsletterTagline} · {monthYear}
    </p>
  </div>

  <!-- CONTENT -->
  <div style='padding:32px 32px 0'>
    <p style='margin:0 0 20px;font-size:13px;
      font-family:${template.fontHeader};color:#888;
      font-weight:700;letter-spacing:.1em;
      text-transform:uppercase;border-bottom:
      1px solid #eee;padding-bottom:12px'>
      This week in {industryShortLabel}
    </p>

    <h1 style='margin:0 0 12px;font-size:22px;
      font-family:${template.fontHeader};
      font-weight:400;line-height:1.3;
      color:${template.primaryColor}'>
      {storyHeadline}
    </h1>

    {storyParagraphs}
    <!-- Each paragraph:
    <p style='margin:0 0 16px;font-size:15px;
      line-height:1.7;color:#333'>
      paragraph text
    </p> -->

    <!-- Optional pull quote if the story has
         a strong stat or quote worth highlighting -->
    <div style='background:#f9f9f7;border-left:
      3px solid ${template.primaryColor};padding:16px 20px;
      margin:0 0 28px;border-radius:0 4px 4px 0'>
      <p style='margin:0;font-size:14px;
        line-height:1.6;color:#444;
        font-style:italic'>
        {pullQuoteOrStatistic}
      </p>
    </div>

    {connectionParagraph}
    <!-- Same paragraph style as story -->
  </div>

  <!-- OFFER BLOCK -->
  <div style='margin:24px 32px 32px;
    background:${template.primaryColor};border-radius:6px;
    padding:24px'>
    <p style='margin:0 0 4px;font-family:${template.fontHeader};font-size:10px;font-weight:700;
      letter-spacing:.12em;color:#888;
      text-transform:uppercase'>
      From {businessName}
    </p>
    <p style='margin:0 0 16px;font-size:15px;
      line-height:1.6;color:#e8e8e8'>
      {offerText}
    </p>
    <a href='{ctaUrl}' style='display:inline-block;
      background:${template.secondaryColor};color:${template.primaryColor};
      font-family:${template.fontHeader};font-size:13px;
      font-weight:700;padding:10px 20px;
      border-radius:4px;text-decoration:none'>
      {ctaLabel} →
    </a>
  </div>

  <!-- FOOTER -->
  <div style='padding:16px 32px 24px;
    border-top:1px solid #eee'>
    <p style='margin:0;font-family:${template.fontHeader};font-size:11px;color:#aaa'>
      You're receiving this from {businessName}
      &nbsp;·&nbsp;
      <a href='{{UNSUBSCRIBE_LINK}}'
        style='color:#aaa'>Unsubscribe</a>
    </p>
  </div>

</div>

Return subject line as first line:
<!-- SUBJECT: subject here -->
Then the HTML below it. Nothing else.`;

  const systemPrompt = systemPromptTemplate
    .replace(/{businessName}/g, job.businessProfile.businessName)
    .replace(/{newsletterTagline}/g, job.businessProfile.newsletterTagline)
    .replace(/{monthYear}/g, monthYear)
    .replace(/{industryShortLabel}/g, industryShortLabel)
    .replace(/{ctaUrl}/g, ctaUrl);

  const userPrompt = `You are writing a short, focused email newsletter
on behalf of ${job.businessProfile.businessName}.

From the news articles provided, choose the SINGLE
most relevant story for an audience of ${job.businessProfile.targetAudience}.
Ignore all other articles.

Write the newsletter with this exact structure:

1. The story (2-3 paragraphs):
   - What happened, explained clearly
   - Why it matters to ${job.businessProfile.targetAudience}
   - One insight or implication worth thinking about

2. One short paragraph (2-3 sentences max) that
   naturally connects this story to ${job.businessProfile.businessName}'s
   work. Do NOT use phrases like 'that's where we
   come in' or 'this is why you need us'. Write it
   the way a knowledgeable friend would mention it
   in conversation.

3. One offer block (3-4 sentences max):
   - Reference the current offer: ${job.businessProfile.currentOffers}
   - Frame it as helpful, not urgent
   - One CTA link — label it something specific,
     NOT 'click here' or 'learn more'

Rules:
- No generic opener sentences about 'the landscape'
- No sign-off with 'The ${job.businessProfile.businessName} Team' —
  sign off from a real person's name if provided,
  otherwise just '${job.businessProfile.businessName}'
- No repeated CTAs
- No bullet points anywhere in the newsletter body
- Write like a smart human, not a marketing robot
- Target length: 250-350 words total. Not more.

Business Details:
Industry: ${job.businessProfile.industry}
Brand voice / tone: ${job.businessProfile.brandVoice} — ${job.businessProfile.tone}
Newsletter Tagline: ${job.businessProfile.newsletterTagline}
Month/Year: ${monthYear}
Industry Short Label: ${industryShortLabel}
CTA URL: ${ctaUrl}
Owner Name: ${job.businessProfile.user.name || ''}

${job.editNote ? `Client Feedback to address: ${job.editNote}` : ''}

Today's relevant news articles:
${articles.map(a => `- ${a.title}: ${a.description} (${a.source})`).join('\n')}`;

  const content = await generateContent(systemPrompt, userPrompt);

  const subjectMatch = content.match(/<!-- SUBJECT: (.*?) -->/);
  const subject = subjectMatch ? subjectMatch[1] : `Latest from ${job.businessProfile.businessName}`;
  const previewText = ""; // Preview text not explicitly requested in new structure but good to have empty if not matched

  // Clean up markers from HTML
  const htmlContent = content
    .replace(/<!-- SUBJECT: .*? -->/, '')
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
