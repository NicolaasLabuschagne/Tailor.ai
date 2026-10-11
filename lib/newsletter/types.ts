// Shared types for the newsletter design system. Client-safe: no server imports.

export type BaseLayout = 'editorial' | 'magazine' | 'cards' | 'letter';
export type FontChoice = 'classic-serif' | 'display-serif' | 'modern-sans' | 'grotesk';
export type Corner = 'sharp' | 'soft' | 'round';
export type HeaderTone = 'light' | 'accent' | 'dark';

export interface DesignSpec {
  layout: BaseLayout;
  name: string;
  mood?: string;
  accent: string;      // hex
  background: string;  // page background behind the email body
  surface: string;     // email body background
  headingFont: FontChoice;
  bodyFont: FontChoice;
  corner: Corner;
  headerTone: HeaderTone;
  heroImage: boolean;  // use the lead article's photo when one exists
}

export interface StoryRef {
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  imageUrl?: string;
}

export interface NewsletterContent {
  subject: string;
  preheader: string;
  kicker: string;
  intro: string;
  lead: {
    headline: string;
    dek: string;
    paragraphs: string[];
    sourceName: string;
    sourceUrl: string;
    imageUrl?: string;
  };
  keyStat?: { value: string; label: string } | null;
  stories: StoryRef[];
  connection: string;
  offer: { headline: string; body: string; ctaLabel: string };
  signoff: string;
  issueDate?: string; // ISO date the issue was written
}

export interface Brand {
  name: string;
  tagline: string;
  primary: string;
  secondary: string;
  logoUrl?: string | null;
  websiteUrl: string;
  ownerName?: string | null;
}

export const TEMPLATE_PREFIX = 'template:';

export interface UserTemplate {
  html: string;
  contentMap: string | null;
  source: string;
  isActive: boolean;
}

export interface CatalogLayout {
  id: string;            // "preset:<key>" built-ins, DB id for saved designs, "template:<id>" for My Templates
  name: string;
  kind: 'preset' | 'saved' | 'template';
  design?: DesignSpec;   // preset + saved
  template?: UserTemplate; // template
  isFavorite?: boolean;
  createdAt?: string;
}

export const LAYOUT_LABELS: Record<BaseLayout, string> = {
  editorial: 'Editorial',
  magazine: 'Magazine',
  cards: 'Modern cards',
  letter: 'Personal letter',
};
