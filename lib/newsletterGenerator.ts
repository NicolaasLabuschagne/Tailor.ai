import { NewsletterTemplate } from '@prisma/client';
import prisma from './prisma';
import { fetchNewsForBusiness } from './ingestion';
import { sendNoNewsNotification } from './emailDelivery';
import { JSDOM } from 'jsdom';
import { writeNewsletterContent } from './newsletter/content';
import { artDirect } from './newsletter/artDirector';
import { renderNewsletter } from './newsletter/render';
import { getBrand, recentDesigns, resolveLayout, saveLayout } from './newsletter/catalog';
import { renderTemplateWithContent } from './newsletter/templateRender';
import { Brand, DesignSpec, NewsletterContent, TEMPLATE_PREFIX } from './newsletter/types';

const CUSTOM_TEMPLATE_SOURCES = ['UNLAYER', 'PASTED', 'AI_GENERATED'];

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

  const profile = job.businessProfile;
  const activeTemplate = profile.templates[0];

  let articles = await fetchNewsForBusiness(profile);

  if (!profile.includeTrending) {
    articles = articles.filter(a => !a.isTrending);
  }

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

  const content = await writeNewsletterContent(profile, articles, {
    editNote: job.editNote,
    topStoryIsTrending: articles[0]?.isTrending,
  });
  const brand = await getBrand(profile);

  let htmlContent: string;
  let design: DesignSpec | null = null;
  let layoutId: string | null = job.layoutId;

  // Keep a template this issue was already switched to; otherwise an active custom template
  // wins unless the issue was moved to a catalog layout
  const issueTemplate = job.layoutId?.startsWith(TEMPLATE_PREFIX)
    ? await findTemplate(job.layoutId.slice(TEMPLATE_PREFIX.length), job.businessProfileId)
    : null;
  const template = issueTemplate ?? (!job.layoutId && activeTemplate && isUsableTemplate(activeTemplate) ? activeTemplate : null);

  if (template) {
    htmlContent = fillTemplate(template, content, brand);
    layoutId = TEMPLATE_PREFIX + template.id;
  } else {
    ({ design, layoutId } = await chooseDesign(job, brand, content));
    htmlContent = renderNewsletter(content, design, brand);
  }

  await prisma.newsletterJob.update({
    where: { id: jobId },
    data: {
      status: 'AWAITING_APPROVAL',
      subject: content.subject,
      previewText: content.preheader,
      htmlContent,
      contentJson: JSON.stringify(content),
      designJson: design ? JSON.stringify(design) : null,
      layoutId,
      errorMessage: null,
      logs: {
        create: {
          event: job.editNote ? 'REGENERATED' : 'GENERATED',
          message: job.editNote
            ? ("Regenerated with note: " + job.editNote)
            : `Newsletter generated${design ? ` with the "${design.name}" design` : ''}`
        }
      }
    },
  });

  return { subject: content.subject, previewText: content.preheader, htmlContent };
}

// Keep the issue's existing design on regeneration, else the default layout, else ask the art director.
async function chooseDesign(
  job: { designJson: string | null; layoutId: string | null; businessProfileId: string; businessProfile: any },
  brand: Brand,
  content: NewsletterContent
): Promise<{ design: DesignSpec; layoutId: string | null }> {
  if (job.designJson) {
    return { design: JSON.parse(job.designJson), layoutId: job.layoutId };
  }

  const defaultId: string | null = job.businessProfile.defaultLayoutId;
  if (defaultId) {
    const design = await resolveLayout(defaultId, job.businessProfileId, brand);
    if (design) return { design, layoutId: defaultId };
  }

  return designWithArtDirector(job.businessProfileId, job.businessProfile, brand, content);
}

async function designWithArtDirector(businessProfileId: string, profile: any, brand: Brand, content: NewsletterContent) {
  const design = await artDirect(profile, brand, content, await recentDesigns(businessProfileId));
  const saved = await saveLayout(businessProfileId, design);
  return { design, layoutId: saved.id };
}

async function loadJobForRender(jobId: string, businessProfileId: string) {
  const job = await prisma.newsletterJob.findFirst({
    where: { id: jobId, businessProfileId },
    include: { businessProfile: { include: { user: true, templates: { where: { isActive: true }, take: 1 } } } },
  });
  if (!job) throw new Error('Newsletter not found');
  if (!job.contentJson) throw new Error('This newsletter was created before layouts existed. Regenerate it to use the catalog.');
  if (['SENT', 'PROCESSING'].includes(job.status)) throw new Error('This newsletter has already been sent');
  return job;
}

async function saveRender(jobId: string, content: NewsletterContent, design: DesignSpec, layoutId: string, brand: Brand) {
  return prisma.newsletterJob.update({
    where: { id: jobId },
    data: {
      htmlContent: renderNewsletter(content, design, brand),
      designJson: JSON.stringify(design),
      layoutId,
    },
  });
}

// Re-render an issue's existing content in a catalog layout (no new AI writing).
export async function applyLayout(jobId: string, businessProfileId: string, layoutId: string) {
  const job = await loadJobForRender(jobId, businessProfileId);
  const brand = await getBrand(job.businessProfile);

  if (layoutId.startsWith(TEMPLATE_PREFIX)) {
    const template = await findTemplate(layoutId.slice(TEMPLATE_PREFIX.length), businessProfileId);
    if (!template) throw new Error('Template not found');
    return prisma.newsletterJob.update({
      where: { id: jobId },
      data: { htmlContent: fillTemplate(template, JSON.parse(job.contentJson!), brand), designJson: null, layoutId },
    });
  }

  const design = await resolveLayout(layoutId, businessProfileId, brand);
  if (!design) throw new Error('Layout not found');
  return saveRender(jobId, JSON.parse(job.contentJson!), design, layoutId, brand);
}

// Ask the art director for a fresh design for an existing issue; the result is saved to the catalog.
export async function redesignNewsletter(jobId: string, businessProfileId: string) {
  const job = await loadJobForRender(jobId, businessProfileId);
  const brand = await getBrand(job.businessProfile);
  const content: NewsletterContent = JSON.parse(job.contentJson!);
  const current = job.designJson ? [JSON.parse(job.designJson) as DesignSpec] : [];
  const others = (await recentDesigns(businessProfileId)).filter(d => d.name !== current[0]?.name);
  const design = await artDirect(job.businessProfile, brand, content, [...current, ...others]);
  const saved = await saveLayout(businessProfileId, design);
  return saveRender(jobId, content, design, saved.id, brand);
}

function isUsableTemplate(template: NewsletterTemplate): boolean {
  return CUSTOM_TEMPLATE_SOURCES.includes(template.source) && !!template.templateHtml;
}

async function findTemplate(id: string, businessProfileId: string) {
  const template = await prisma.newsletterTemplate.findFirst({ where: { id, businessProfileId } });
  return template && isUsableTemplate(template) ? template : null;
}

// Fill a user's pasted / visual-editor / generated template with the issue's content.
function fillTemplate(template: NewsletterTemplate, content: NewsletterContent, brand: Brand): string {
  return renderTemplateWithContent(
    template.templateHtml || '',
    template.contentMap,
    content,
    { name: brand.name, websiteUrl: brand.websiteUrl },
    (html) => new JSDOM(html).window.document
  );
}
