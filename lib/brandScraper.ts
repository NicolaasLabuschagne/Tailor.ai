import { load } from 'cheerio';

export interface BrandData {
  topColors: string[];
  fonts: string[];
  logoUrl: string | null;
  businessName: string;
  tagline: string;
  tone: string;
}

export function extractBrandData(html: string, url: string): BrandData {
  const $ = load(html);

  // Colors: find most-used hex values
  const colorRegex = /#([0-9A-Fa-f]{6})\b/g;
  const allColors = Array.from(html.matchAll(colorRegex)).map(m => '#' + m[1]);

  const colorCounts = new Map<string, number>();
  allColors.forEach(c => {
    const normalized = c.toLowerCase();
    if (!isNearWhite(normalized) && !isNearBlack(normalized)) {
      colorCounts.set(normalized, (colorCounts.get(normalized) ?? 0) + 1);
    }
  });

  const topColors = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([color]) => color);

  // Fonts
  const fontRegex = /font-family:\s*['"]?([^'";\n,}]+)/g;
  const fonts = Array.from(html.matchAll(fontRegex))
    .map(m => m[1].trim())
    .filter(f => !f.toLowerCase().includes('icon') && !f.toLowerCase().includes('awesome'))
    .slice(0, 2);

  // Logo
  const logoImg = $('header img, .logo img, img[alt*="logo" i], img[class*="logo" i], a[href="/"] img').first().attr('src');
  const logoUrl = logoImg ? resolveUrl(logoImg, url) : null;

  // Business Name
  const businessName = $('meta[property="og:site_name"]').attr('content')
    || $('title').text().split(/[-|·]/)[0].trim()
    || new URL(url).hostname;

  // Tagline
  const tagline = $('meta[name="description"]').attr('content')
    || $('meta[property="og:description"]').attr('content')
    || '';

  // Tone
  const pageText = $('body').text().toLowerCase();
  const tone = detectTone(pageText, html);

  return {
    topColors,
    fonts,
    logoUrl,
    businessName,
    tagline,
    tone
  };
}

function isNearWhite(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r > 240 && g > 240 && b > 240;
}

function isNearBlack(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r < 15 && g < 15 && b < 15;
}

function resolveUrl(path: string, base: string): string {
  try {
    return new URL(path, base).href;
  } catch (e) {
    return path;
  }
}

function detectTone(text: string, html: string): string {
  if (text.includes('minimal') || text.includes('clean') || text.includes('simple')) return 'minimal';
  if (html.includes('font-size: 2') || html.includes('font-weight: 700') || html.includes('uppercase')) return 'bold';
  if (text.includes('friendly') || text.includes('happy') || text.includes('welcome')) return 'friendly';
  return 'professional';
}
