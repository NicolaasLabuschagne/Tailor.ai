import { BusinessProfile } from '@prisma/client';
import { generateJSON } from '../groq';
import { Brand, DesignSpec, NewsletterContent, BaseLayout, FontChoice, Corner, HeaderTone } from './types';
import { normalizeHex, contrast, mix } from './color';
import { presetKeys, resolvePreset } from './presets';

const LAYOUTS: Record<BaseLayout, string> = {
  editorial: 'Newspaper-style masthead, serif or crisp headlines, numbered story list. Authoritative, calm.',
  magazine: 'Big color header band with the headline inside it, full-bleed photo, two-column story grid, dark offer band. Bold, energetic.',
  cards: 'Tinted canvas with rounded white content cards and story thumbnails. Modern, friendly, app-like.',
  letter: 'A personal note from the owner: minimal, text-first, P.S.-style offer. Warm, human, intimate.',
};

const FONTS: FontChoice[] = ['classic-serif', 'display-serif', 'modern-sans', 'grotesk'];
const CORNERS: Corner[] = ['sharp', 'soft', 'round'];
const TONES: HeaderTone[] = ['light', 'accent', 'dark'];

const SYSTEM_PROMPT = `You are the art director of a design studio that produces premium email newsletters.
For each issue you choose a design that fits the brand AND the mood of this issue's content, so every issue feels considered and distinct while staying on-brand.

Available layouts:
${Object.entries(LAYOUTS).map(([k, v]) => `- "${k}": ${v}`).join('\n')}

Fonts: "classic-serif" (Georgia), "display-serif" (Playfair Display, elegant), "modern-sans" (Inter, clean), "grotesk" (Archivo, bold and punchy).

Design rules:
- "accent" must be the brand's primary color or a refined variation of it (deeper, richer or slightly shifted). Never an unrelated hue.
- "surface" (email body) should almost always be white or a very light warm/cool off-white for readability.
- "background" (page behind the email) should be a subtle neutral or a very light tint of the accent; for "cards" it must visibly differ from surface.
- Pair fonts with intent: serif headings feel editorial and premium; grotesk feels bold and modern; letter layouts suit classic-serif.
- "headerTone": "light" (header on white), "accent" (header band in accent color), "dark" (near-black header band).
- Set "heroImage" true only if the lead story has a photo and the layout benefits from it.
- Do not repeat the exact same layout + font combination as the most recent issue.
- Give the design an evocative 2-3 word "name" (e.g. "Harbor Ledger", "Copper Signal") and a one-sentence "mood".

Return ONLY JSON:
{ "name": "", "mood": "", "layout": "", "accent": "#hex", "background": "#hex", "surface": "#hex", "headingFont": "", "bodyFont": "", "corner": "sharp|soft|round", "headerTone": "light|accent|dark", "heroImage": true }`;

export async function artDirect(
  profile: BusinessProfile,
  brand: Brand,
  content: NewsletterContent,
  recent: DesignSpec[] = []
): Promise<DesignSpec> {
  const userPrompt = `Brand: ${brand.name}
Industry: ${profile.industry}
Brand voice: ${profile.brandVoice} — ${profile.tone}
Brand primary color: ${brand.primary}
Brand secondary color: ${brand.secondary}

This issue:
- Section: ${content.kicker}
- Lead headline: ${content.lead.headline}
- Lead standfirst: ${content.lead.dek}
- Lead has photo: ${content.lead.imageUrl ? 'yes' : 'no'}
- Other stories: ${content.stories.map((s) => s.headline).join(' | ')}
- Has key statistic: ${content.keyStat ? 'yes' : 'no'}

Recent issues (most recent first) — vary from these:
${recent.length ? recent.map((d) => `- ${d.name}: ${d.layout}, ${d.headingFont}/${d.bodyFont}, accent ${d.accent}, header ${d.headerTone}`).join('\n') : '- none yet'}`;

  try {
    const raw = await generateJSON<Partial<DesignSpec>>(SYSTEM_PROMPT, userPrompt, 0.9);
    return sanitizeDesign(raw, brand, content);
  } catch (error) {
    console.error('Art director failed, falling back to a preset:', error);
    const keys = presetKeys();
    const lastName = recent[0]?.name;
    const key = keys.find((k) => resolvePreset(k, brand)!.name !== lastName) ?? keys[0];
    return resolvePreset(key, brand)!;
  }
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function sanitizeDesign(raw: Partial<DesignSpec>, brand: Brand, content?: NewsletterContent): DesignSpec {
  const layout = pick(raw.layout, Object.keys(LAYOUTS) as BaseLayout[], 'editorial');
  let accent = normalizeHex(raw.accent, normalizeHex(brand.primary, '#1f3a5f'));
  if (contrast(accent, '#ffffff') < 2) accent = mix(accent, '#000000', 0.45);

  const surface = normalizeHex(raw.surface, '#ffffff');
  let background = normalizeHex(raw.background, '#f3f3f3');
  if (layout === 'cards' && contrast(background, surface) < 1.06) background = mix(surface, accent, 0.07);

  return {
    layout,
    name: (typeof raw.name === 'string' && raw.name.trim().slice(0, 40)) || 'Untitled design',
    mood: typeof raw.mood === 'string' ? raw.mood.trim().slice(0, 160) : undefined,
    accent,
    background,
    surface,
    headingFont: pick(raw.headingFont, FONTS, 'modern-sans'),
    bodyFont: pick(raw.bodyFont, FONTS, 'classic-serif'),
    corner: pick(raw.corner, CORNERS, 'soft'),
    headerTone: pick(raw.headerTone, TONES, 'light'),
    heroImage: raw.heroImage !== false && (content ? !!content.lead.imageUrl : true),
  };
}
