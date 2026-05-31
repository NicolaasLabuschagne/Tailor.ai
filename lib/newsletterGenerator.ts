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
        include: {
          newsSource: true,
          user: true,
          templates: {
            where: { isActive: true },
            take: 1
          }
        }
      }
    },
  });

  if (!job) throw new Error('Job not found');

  const activeTemplate = job.businessProfile.templates[0];

  let articles = await fetchNewsForBusiness(job.businessProfile);

  if (!job.businessProfile.includeTrending) {
    articles = articles.filter(a => !a.isTrending);
  }

  const topStoryIsTrending = articles[0]?.isTrending;

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

  // Default fallback if no active template
  const effectiveTemplate: any = activeTemplate || {
    primaryColor: '#1a1a1a',
    secondaryColor: '#ffffff',
    fontHeader: 'Arial, sans-serif',
    fontBody: 'Georgia, Times New Roman, serif',
    logoUrl: null,
    source: 'CUSTOM'
  };

  const systemPromptTemplate = "You are a professional newsletter copywriter. You write in the brand voice \n" +
"of the business provided. Your job is to take real news articles and reframe \n" +
"them to be relevant and valuable to the business's audience, while \n" +
"naturally connecting the news to the business's products or services.\n" +
"Always write as if you are the business owner speaking directly to their customers.\n" +
"\n" +
"CRITICAL RULE: If you receive fewer than 2 \n" +
"real news articles, respond with only this \n" +
"exact JSON and nothing else:\n" +
"{ \"error\": \"insufficient_articles\" }\n" +
"\n" +
"Do NOT write a newsletter. Do NOT apologize. \n" +
"Do NOT explain. Just return that JSON.\n" +
"The application will handle the failure.\n" +
"\n" +
"Output only valid HTML using these exact inline \n" +
"styles. Do not invent your own design. Structure:\n" +
"\n" +
"<div style='max-width:560px;margin:0 auto;\n" +
"  background:" + effectiveTemplate.secondaryColor + ";font-family:" + effectiveTemplate.fontBody + "'>\n" +
"\n" +
"  <!-- HEADER -->\n" +
"  <div style='background:" + effectiveTemplate.primaryColor + ";padding:\n" +
"    24px 32px;text-align:center'>\n" +
"    " + (effectiveTemplate.logoUrl ? "<img src=\"" + effectiveTemplate.logoUrl + "\" style=\"height:32px;margin-bottom:8px\">" : "") + "\n" +
"    <p style='margin:0 0 4px;font-family:" + effectiveTemplate.fontHeader + ";font-size:10px;font-weight:700;\n" +
"      letter-spacing:.15em;color:#888;\n" +
"      text-transform:uppercase'>\n" +
"      {businessName}\n" +
"    </p>\n" +
"    <p style='margin:0;font-size:11px;\n" +
"      font-family:" + effectiveTemplate.fontHeader + ";color:#555'>\n" +
"      {newsletterTagline} · {monthYear}\n" +
"    </p>\n" +
"  </div>\n" +
"\n" +
"  <!-- CONTENT -->\n" +
"  <div style='padding:32px 32px 0'>\n" +
"    <p style='margin:0 0 20px;font-size:13px;\n" +
"      font-family:" + effectiveTemplate.fontHeader + ";color:#888;\n" +
"      font-weight:700;letter-spacing:.1em;\n" +
"      text-transform:uppercase;border-bottom:\n" +
"      1px solid #eee;padding-bottom:12px'>\n" +
"      This week in {industryShortLabel}\n" +
"    </p>\n" +
"\n" +
"    <h1 style='margin:0 0 12px;font-size:22px;\n" +
"      font-family:" + effectiveTemplate.fontHeader + ";\n" +
"      font-weight:400;line-height:1.3;\n" +
"      color:" + effectiveTemplate.primaryColor + "'>\n" +
"      {storyHeadline}\n" +
"    </h1>\n" +
"\n" +
"    {storyParagraphs}\n" +
"    <!-- Each paragraph: \n" +
"    <p style='margin:0 0 16px;font-size:15px;\n" +
"      line-height:1.7;color:#333'>\n" +
"      paragraph text\n" +
"    </p> -->\n" +
"\n" +
"    <!-- Optional pull quote if the story has \n" +
"         a strong stat or quote worth highlighting -->\n" +
"    <div style='background:#f9f9f7;border-left:\n" +
"      3px solid " + effectiveTemplate.primaryColor + ";padding:16px 20px;\n" +
"      margin:0 0 28px;border-radius:0 4px 4px 0'>\n" +
"      <p style='margin:0;font-size:14px;\n" +
"        line-height:1.6;color:#444;\n" +
"        font-style:italic'>\n" +
"        {pullQuoteOrStatistic}\n" +
"      </p>\n" +
"    </div>\n" +
"\n" +
"    {connectionParagraph}\n" +
"    <!-- Same paragraph style as story -->\n" +
"  </div>\n" +
"\n" +
"  <!-- OFFER BLOCK -->\n" +
"  <div style='margin:24px 32px 32px;\n" +
"    background:" + effectiveTemplate.primaryColor + ";border-radius:6px;\n" +
"    padding:24px'>\n" +
"    <p style='margin:0 0 4px;font-family:" + effectiveTemplate.fontHeader + ";font-size:10px;font-weight:700;\n" +
"      letter-spacing:.12em;color:#888;\n" +
"      text-transform:uppercase'>\n" +
"      From {businessName}\n" +
"    </p>\n" +
"    <p style='margin:0 0 16px;font-size:15px;\n" +
"      line-height:1.6;color:#e8e8e8'>\n" +
"      {offerText}\n" +
"    </p>\n" +
"    <a href='{ctaUrl}' style='display:inline-block;\n" +
"      background:" + effectiveTemplate.secondaryColor + ";color:" + effectiveTemplate.primaryColor + ";\n" +
"      font-family:" + effectiveTemplate.fontHeader + ";font-size:13px;\n" +
"      font-weight:700;padding:10px 20px;\n" +
"      border-radius:4px;text-decoration:none'>\n" +
"      {ctaLabel} →\n" +
"    </a>\n" +
"  </div>\n" +
"\n" +
"  <!-- FOOTER -->\n" +
"  <div style='padding:16px 32px 24px;\n" +
"    border-top:1px solid #eee'>\n" +
"    <p style='margin:0;font-family:" + effectiveTemplate.fontHeader + ";font-size:11px;color:#aaa'>\n" +
"      You're receiving this from {businessName} \n" +
"      &nbsp;·&nbsp; \n" +
"      <a href='{{UNSUBSCRIBE_LINK}}' \n" +
"        style='color:#aaa'>Unsubscribe</a>\n" +
"    </p>\n" +
"  </div>\n" +
"\n" +
"</div>\n" +
"\n" +
"Return subject line as first line:\n" +
"<!-- SUBJECT: subject here -->\n" +
"Then the HTML below it. Nothing else.";

  const systemPrompt = systemPromptTemplate
    .replace(/{businessName}/g, job.businessProfile.businessName)
    .replace(/{newsletterTagline}/g, job.businessProfile.newsletterTagline)
    .replace(/{monthYear}/g, monthYear)
    .replace(/{industryShortLabel}/g, industryShortLabel)
    .replace(/{ctaUrl}/g, ctaUrl);

  const userPrompt = "You are writing a short, focused email newsletter \n" +
"on behalf of " + job.businessProfile.businessName + ".\n" +
"\n" +
"From the news articles provided, choose the SINGLE \n" +
"most relevant story for an audience of " + job.businessProfile.targetAudience + ". \n" +
"Ignore all other articles.\n" +
"\n" +
"Write the newsletter with this exact structure:\n" +
"\n" +
"1. The story (2-3 paragraphs):\n" +
"   - What happened, explained clearly\n" +
"   - Why it matters to " + job.businessProfile.targetAudience + "\n" +
"   - One insight or implication worth thinking about\n" +
"   \n" +
"2. One short paragraph (2-3 sentences max) that \n" +
"   naturally connects this story to " + job.businessProfile.businessName + "'s \n" +
"   work. Do NOT use phrases like 'that's where we \n" +
"   come in' or 'this is why you need us'. Write it \n" +
"   the way a knowledgeable friend would mention it \n" +
"   in conversation.\n" +
"\n" +
"3. One offer block (3-4 sentences max):\n" +
"   - Reference the current offer: " + job.businessProfile.currentOffers + "\n" +
"   - Frame it as helpful, not urgent\n" +
"   - One CTA link — label it something specific, \n" +
"     NOT 'click here' or 'learn more'\n" +
"\n" +
"Rules:\n" +
"- No generic opener sentences about 'the landscape'\n" +
"- No sign-off with 'The " + job.businessProfile.businessName + " Team' — \n" +
"  sign off from a real person's name if provided, \n" +
"  otherwise just '" + job.businessProfile.businessName + "'\n" +
"- No repeated CTAs\n" +
"- No bullet points anywhere in the newsletter body\n" +
"- Write like a smart human, not a marketing robot\n" +
"- Target length: 250-350 words total. Not more.\n" +
"\n" +
"Business Details:\n" +
"Industry: " + job.businessProfile.industry + "\n" +
"Brand voice / tone: " + job.businessProfile.brandVoice + " — " + job.businessProfile.tone + "\n" +
"Newsletter Tagline: " + job.businessProfile.newsletterTagline + "\n" +
"Month/Year: " + monthYear + "\n" +
"Industry Short Label: " + industryShortLabel + "\n" +
"CTA URL: " + ctaUrl + "\n" +
"Owner Name: " + (job.businessProfile.user.name || '') + "\n" +
"\n" +
(job.editNote ? "Client Feedback to address: " + job.editNote : "") + "\n" +
"\n" +
"Today's relevant news articles:\n" +
articles.map(a => "- " + a.title + ": " + a.description + " (" + a.source + ")").join('\n');

  let promptToUse = userPrompt;
  let systemPromptToUse = systemPrompt;

  const isCustomTemplate = activeTemplate && (activeTemplate.source === 'UNLAYER' || activeTemplate.source === 'PASTED' || activeTemplate.source === 'AI_GENERATED');

  if (isCustomTemplate) {
    systemPromptToUse = "You are a professional newsletter copywriter. Your job is to take news articles and reframe them for the provided business.\n" +
"    Return ONLY a JSON object with the following structure:\n" +
"    {\n" +
"      \"subject\": \"Compelling subject line\",\n" +
"      \"topicLabel\": \"Short industry label (e.g. TECH)\",\n" +
"      \"headline\": \"Main story headline\",\n" +
"      \"paragraphs\": [\"First paragraph\", \"Second paragraph\", \"Third paragraph\"],\n" +
"      \"pullQuote\": \"A strong stat or quote from the story\",\n" +
"      \"connectionParagraph\": \"Natural bridge to the business work\",\n" +
"      \"offerText\": \"The promotional offer text\",\n" +
"      \"ctaLabel\": \"Action-oriented button text\"\n" +
"    }\n" +
"    \n" +
"    CRITICAL: If you receive fewer than 2 real news articles, respond with exactly:\n" +
"    { \"error\": \"insufficient_articles\" }";

    const trendingInstruction = topStoryIsTrending ? "\n" +
"    IMPORTANT: The top story this week is a viral trending story that may not directly relate to " + job.businessProfile.businessName + "'s industry. This is intentional.\n" +
"\n" +
"    Your job is to find the most clever, natural connection between this trending story and the business. Think like a smart columnist — what angle makes this story relevant to " + job.businessProfile.targetAudience + "?\n" +
"    \n" +
"    Be creative. The connection should feel insightful, not forced.\n" +
"    " : '';

    promptToUse = "Generate the newsletter content as JSON for " + job.businessProfile.businessName + ".\n" +
"    Target audience: " + job.businessProfile.targetAudience + "\n" +
"    Current offer: " + job.businessProfile.currentOffers + "\n" +
"\n" +
    trendingInstruction + "\n" +
"    \n" +
"    Rules:\n" +
"    - Exactly ONE story\n" +
"    - 250-350 words total in paragraphs\n" +
"    - No filler sentences\n" +
"    \n" +
"    Articles:\n" +
    articles.map(a => "- " + a.title + ": " + a.description).join('\n');
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

  if (isCustomTemplate && activeTemplate) {
    try {
      const data = JSON.parse(content);

      subject = data.subject;
      let shell = activeTemplate.templateHtml || '';

      // Handle {{SUBJECT}} merge tag separately
      shell = shell.replace(/{{SUBJECT}}/g, data.subject || '');

      const contentMapStr = activeTemplate.contentMap;
      const contentMap = contentMapStr ? JSON.parse(contentMapStr) : null;

      if ((activeTemplate.source === 'PASTED' || activeTemplate.source === 'AI_GENERATED') && contentMap) {
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
      throw new Error("AI failed to provide valid JSON for template");
    }
  } else {
    const subjectMatch = content.match(/<!-- SUBJECT: (.*?) -->/);
    subject = subjectMatch ? subjectMatch[1] : ("Latest from " + job.businessProfile.businessName);

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
          message: job.editNote ? ("Regenerated with note: " + job.editNote) : 'Newsletter content generated successfully'
        }
      }
    },
  });

  return { subject, previewText, htmlContent };
}
