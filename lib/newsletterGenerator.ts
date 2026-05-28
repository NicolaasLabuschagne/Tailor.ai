import prisma from './prisma';
import { fetchNewsForBusiness } from './ingestion';
import { generateContent } from './groq';
import { sendNoNewsNotification } from './emailDelivery';
import { JSDOM } from 'jsdom';

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

  const totalContent = articles
    .map(a => a.title + a.description)
    .join(" ");

  if (!articles || articles.length === 0 || totalContent.length < 200) {
    await prisma.newsletterJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage: "No news articles found for this business profile. Check keywords and news sources in Settings, or broaden your topic keywords.",
        logs: {
          create: {
            event: 'FAILED',
            message: 'Ingestion returned 0 or insufficient articles — generation skipped'
          }
        }
      }
    });

    await sendNoNewsNotification(job.businessProfileId);
    return;
  }

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

CRITICAL RULE: If you receive fewer than 2
real news articles, respond with only this
exact JSON and nothing else:
{ "error": "insufficient_articles" }

Do NOT write a newsletter. Do NOT apologize.
Do NOT explain. Just return that JSON.
The application will handle the failure.

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

  let promptToUse = userPrompt;
  let systemPromptToUse = systemPrompt;

  const isCustomTemplate = job.businessProfile.activeTemplateSource === 'unlayer' || job.businessProfile.activeTemplateSource === 'pasted';

  if (isCustomTemplate) {
    systemPromptToUse = `You are a professional newsletter copywriter. Your job is to take news articles and reframe them for the provided business.
    Return ONLY a JSON object with the following structure:
    {
      "subject": "Compelling subject line",
      "topicLabel": "Short industry label (e.g. TECH)",
      "headline": "Main story headline",
      "paragraphs": ["First paragraph", "Second paragraph", "Third paragraph"],
      "pullQuote": "A strong stat or quote from the story",
      "connectionParagraph": "Natural bridge to the business work",
      "offerText": "The promotional offer text",
      "ctaLabel": "Action-oriented button text"
    }

    CRITICAL: If you receive fewer than 2 real news articles, respond with exactly:
    { "error": "insufficient_articles" }`;

    promptToUse = `Generate the newsletter content as JSON for ${job.businessProfile.businessName}.
    Target audience: ${job.businessProfile.targetAudience}
    Current offer: ${job.businessProfile.currentOffers}

    Rules:
    - Exactly ONE story
    - 250-350 words total in paragraphs
    - No filler sentences

    Articles:
    ${articles.map(a => `- ${a.title}: ${a.description}`).join('\n')}`;
  }

  const content = await generateContent(systemPromptToUse, promptToUse);

  try {
    const parsed = JSON.parse(content);
    if (parsed.error === 'insufficient_articles') {
      await prisma.newsletterJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: 'Groq reported insufficient articles',
          logs: {
            create: { event: 'FAILED', message: 'Groq reported insufficient articles' }
          }
        }
      });
      await sendNoNewsNotification(job.businessProfileId);
      return;
    }
  } catch (e) {
    // Proceed as newsletter
  }

  let subject, htmlContent;

  if (isCustomTemplate) {
    try {
      const data = JSON.parse(content);
      if (data.error === 'insufficient_articles') {
        // Handled below by catch or already matched
      }

      subject = data.subject;
      let shell = job.businessProfile.activeTemplateSource === 'pasted'
        ? job.businessProfile.pastedTemplateHtml!
        : job.businessProfile.templateHtml!;

      const contentMap = job.businessProfile.activeTemplateSource === 'pasted'
        ? JSON.parse(job.businessProfile.pastedTemplateMap!)
        : null;

      if (job.businessProfile.activeTemplateSource === 'pasted' && contentMap) {
         const dom = new JSDOM(shell);
         const doc = dom.window.document;

         const inject = (selector: string | null, value: string, attr?: string) => {
           if (!selector || !value) return;
           const el = doc.querySelector(selector);
           if (el) {
             if (attr) el.setAttribute(attr, value);
             else el.textContent = value;
           }
         };

         inject(contentMap.headline, data.headline);
         inject(contentMap.paragraph1, data.paragraphs[0]);
         inject(contentMap.paragraph2, data.paragraphs[1]);
         inject(contentMap.paragraph3, data.paragraphs[2]);
         inject(contentMap.offerText, data.offerText);
         inject(contentMap.ctaLabel, data.ctaLabel);
         inject(contentMap.ctaHref, job.businessProfile.websiteUrl || '#', 'href');
         inject(contentMap.topicLabel, data.topicLabel);

         // Always inject unsubscribe link into generic footer links if found
         doc.querySelectorAll('a').forEach(a => {
           if (a.textContent?.toLowerCase().includes('unsubscribe')) {
             a.setAttribute('href', '{{UNSUBSCRIBE_LINK}}');
           }
         });

         shell = dom.serialize();
      }

      const replacements: Record<string, string> = {
        '{{SUBJECT}}': data.subject,
        '{{TOPIC_LABEL}}': data.topicLabel,
        '{{HEADLINE}}': data.headline,
        '{{PARAGRAPH_1}}': data.paragraphs[0] || '',
        '{{PARAGRAPH_2}}': data.paragraphs[1] || '',
        '{{PARAGRAPH_3}}': data.paragraphs[2] || '',
        '{{PULL_QUOTE}}': data.pullQuote,
        '{{CONNECTION}}': data.connectionParagraph,
        '{{OFFER_TEXT}}': data.offerText,
        '{{CTA_LABEL}}': data.ctaLabel,
        '{{BUSINESS_NAME}}': job.businessProfile.businessName,
        '{{WEBSITE_URL}}': job.businessProfile.websiteUrl || '#',
      };

      for (const [key, val] of Object.entries(replacements)) {
        shell = shell.replace(new RegExp(key, 'g'), val);
      }

      htmlContent = shell;
    } catch (e) {
      console.error("Failed to parse JSON content for template:", e);
      // Fallback logic or error
      throw new Error("AI failed to provide valid JSON for template");
    }
  } else {
    const subjectMatch = content.match(/<!-- SUBJECT: (.*?) -->/);
    subject = subjectMatch ? subjectMatch[1] : `Latest from ${job.businessProfile.businessName}`;

    // Clean up markers from HTML
    htmlContent = content
      .replace(/<!-- SUBJECT: .*? -->/, '')
      .trim();
  }

  const previewText = "";

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
