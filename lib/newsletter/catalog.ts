// Server-side helpers for brand resolution and the layout catalog.
import { BusinessProfile, NewsletterTemplate, TemplateSource, User } from '@prisma/client';
import prisma from '../prisma';
import { Brand, CatalogLayout, DesignSpec, TEMPLATE_PREFIX } from './types';
import { listPresets, resolvePreset, PRESET_PREFIX } from './presets';

type ProfileWithBrand = BusinessProfile & { user?: User | null; templates?: NewsletterTemplate[] };

export async function getBrand(profile: ProfileWithBrand): Promise<Brand> {
  // Brand colors live on templates: prefer the active one, else the most recently edited
  const template =
    profile.templates?.find((t) => t.isActive) ??
    (await prisma.newsletterTemplate.findFirst({ where: { businessProfileId: profile.id, isActive: true } })) ??
    (await prisma.newsletterTemplate.findFirst({ where: { businessProfileId: profile.id }, orderBy: { updatedAt: 'desc' } }));

  return {
    name: profile.businessName,
    tagline: profile.newsletterTagline ?? '',
    primary: template?.primaryColor ?? '#1f3a5f',
    secondary: template?.secondaryColor ?? '#ffffff',
    logoUrl: template?.logoUrl ?? null,
    websiteUrl: profile.websiteUrl || '',
    ownerName: profile.user?.name ?? null,
  };
}

export async function resolveLayout(layoutId: string, businessProfileId: string, brand: Brand): Promise<DesignSpec | null> {
  if (layoutId.startsWith(PRESET_PREFIX)) {
    return resolvePreset(layoutId.slice(PRESET_PREFIX.length), brand);
  }
  const saved = await prisma.newsletterLayout.findFirst({ where: { id: layoutId, businessProfileId } });
  return saved ? (JSON.parse(saved.designJson) as DesignSpec) : null;
}

export async function saveLayout(businessProfileId: string, design: DesignSpec) {
  return prisma.newsletterLayout.create({
    data: { businessProfileId, name: design.name, designJson: JSON.stringify(design) },
  });
}

export async function recentDesigns(businessProfileId: string, take = 3): Promise<DesignSpec[]> {
  const jobs = await prisma.newsletterJob.findMany({
    where: { businessProfileId, designJson: { not: null } },
    orderBy: { createdAt: 'desc' },
    take,
    select: { designJson: true },
  });
  return jobs.map((j) => JSON.parse(j.designJson!) as DesignSpec);
}

const TEMPLATE_SOURCES: TemplateSource[] = ['UNLAYER', 'PASTED', 'AI_GENERATED'];

export async function listCatalog(businessProfileId: string, brand: Brand): Promise<CatalogLayout[]> {
  const [saved, templates] = await Promise.all([
    prisma.newsletterLayout.findMany({
      where: { businessProfileId },
      orderBy: [{ isFavorite: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.newsletterTemplate.findMany({
      where: { businessProfileId, source: { in: TEMPLATE_SOURCES }, templateHtml: { not: null } },
      orderBy: { slotNumber: 'asc' },
    }),
  ]);
  return [
    // The user's own templates from the Newsletter Designer come first
    ...templates.map((t) => ({
      id: TEMPLATE_PREFIX + t.id,
      name: t.name,
      kind: 'template' as const,
      template: { html: t.templateHtml!, contentMap: t.contentMap, source: t.source, isActive: t.isActive },
      createdAt: t.createdAt.toISOString(),
    })),
    ...listPresets(brand),
    ...saved.map((l) => ({
      id: l.id,
      name: l.name,
      kind: 'saved' as const,
      design: JSON.parse(l.designJson) as DesignSpec,
      isFavorite: l.isFavorite,
      createdAt: l.createdAt.toISOString(),
    })),
  ];
}

export async function getBusinessProfileForEmail(email: string) {
  return prisma.businessProfile.findFirst({
    where: { user: { email } },
    include: { user: true, templates: { where: { isActive: true }, take: 1 } },
  });
}

// What new issues will use: an active custom template wins, then the default layout, else the AI (null)
export async function effectiveDefaultLayoutId(profile: { id: string; defaultLayoutId: string | null }): Promise<string | null> {
  const active = await prisma.newsletterTemplate.findFirst({
    where: { businessProfileId: profile.id, isActive: true, source: { in: TEMPLATE_SOURCES }, templateHtml: { not: null } },
    select: { id: true },
  });
  return active ? TEMPLATE_PREFIX + active.id : profile.defaultLayoutId;
}
