import { Brand, CatalogLayout, DesignSpec } from './types';
import { normalizeHex, contrast } from './color';

type PresetDef = Omit<DesignSpec, 'accent'> & { accent: 'brand' | string };

// Polished built-in designs. "brand" accents adopt the business's primary color.
const PRESETS: Record<string, PresetDef> = {
  'classic-editorial': {
    layout: 'editorial', name: 'Classic Editorial', mood: 'Newspaper masthead, serif headlines, calm and authoritative',
    accent: 'brand', background: '#f4f1ea', surface: '#fffdf8',
    headingFont: 'display-serif', bodyFont: 'classic-serif', corner: 'sharp', headerTone: 'light', heroImage: true,
  },
  'bold-magazine': {
    layout: 'magazine', name: 'Bold Magazine', mood: 'Full-bleed color header, heavy sans headlines, high energy',
    accent: 'brand', background: '#ececec', surface: '#ffffff',
    headingFont: 'grotesk', bodyFont: 'modern-sans', corner: 'sharp', headerTone: 'accent', heroImage: true,
  },
  'midnight-brief': {
    layout: 'magazine', name: 'Midnight Brief', mood: 'Dark masthead, crisp sans type, premium tech feel',
    accent: 'brand', background: '#1b1d22', surface: '#ffffff',
    headingFont: 'modern-sans', bodyFont: 'modern-sans', corner: 'soft', headerTone: 'dark', heroImage: true,
  },
  'modern-cards': {
    layout: 'cards', name: 'Modern Cards', mood: 'Soft tinted canvas with rounded content cards, friendly and clean',
    accent: 'brand', background: '#eef1f6', surface: '#ffffff',
    headingFont: 'modern-sans', bodyFont: 'modern-sans', corner: 'round', headerTone: 'light', heroImage: true,
  },
  'personal-letter': {
    layout: 'letter', name: 'Personal Letter', mood: 'A note from the owner, minimal and warm, no clutter',
    accent: 'brand', background: '#ffffff', surface: '#ffffff',
    headingFont: 'classic-serif', bodyFont: 'classic-serif', corner: 'soft', headerTone: 'light', heroImage: false,
  },
  'minimal-mono': {
    layout: 'editorial', name: 'Minimal Mono', mood: 'Black and white with a single accent, Swiss-style restraint',
    accent: '#111111', background: '#ffffff', surface: '#ffffff',
    headingFont: 'grotesk', bodyFont: 'modern-sans', corner: 'sharp', headerTone: 'light', heroImage: true,
  },
};

export const PRESET_PREFIX = 'preset:';

// Brand primary, unless it's too pale to carry headlines on a light page
function brandAccent(brand: Brand): string {
  const primary = normalizeHex(brand.primary, '#1f3a5f');
  if (contrast(primary, '#ffffff') >= 2) return primary;
  const secondary = normalizeHex(brand.secondary, '#1f3a5f');
  return contrast(secondary, '#ffffff') >= 2 ? secondary : '#1f3a5f';
}

export function resolvePreset(key: string, brand: Brand): DesignSpec | null {
  const def = PRESETS[key];
  if (!def) return null;
  return { ...def, accent: def.accent === 'brand' ? brandAccent(brand) : def.accent };
}

export function listPresets(brand: Brand): CatalogLayout[] {
  return Object.keys(PRESETS).map((key) => ({
    id: PRESET_PREFIX + key,
    name: PRESETS[key].name,
    kind: 'preset' as const,
    design: resolvePreset(key, brand)!,
  }));
}

export function presetKeys(): string[] {
  return Object.keys(PRESETS);
}
