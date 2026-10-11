import { load } from 'cheerio';

export interface BrandData {
  topColors: string[];
  fonts: string[];
  logoUrl: string | null;
  businessName: string;
  tagline: string;
  tone: string;
}

export async function extractBrandData(html: string, url: string): Promise<BrandData> {
    const $ = load(html);

    const colors = new Set<string>();
    const fonts = new Set<string>();
    let logoUrl: string | null = null;

    // -----------------------------
    // 1. Inline styles
    // -----------------------------
    $('[style]').each((_, el) => {
        const style = $(el).attr('style') || '';
        const matches = style.match(/#([0-9A-Fa-f]{3,6})\b/g);
        matches?.forEach(c => colors.add(c.toLowerCase()));
    });

    // -----------------------------
    // 2. Tailwind arbitrary colors
    // -----------------------------
    const tailwindMatches = html.match(/#([0-9A-Fa-f]{3,6})\b/g);
    tailwindMatches?.forEach(c => colors.add(c.toLowerCase()));

    // -----------------------------
    // 3. External CSS files
    // -----------------------------
    const cssLinks = $('link[rel="stylesheet"]')
        .map((_, el) => $(el).attr('href'))
        .get()
        .filter(Boolean);

    for (const href of cssLinks) {
        try {
            const cssUrl = new URL(href!, url).toString();
            const css = await fetch(cssUrl).then(r => r.text());

            // Extract colors
            const cssColors = css.match(/#([0-9A-Fa-f]{3,6})\b/g);
            cssColors?.forEach(c => colors.add(c.toLowerCase()));

            // Extract fonts
            const fontMatches = css.match(/font-family:\s*['"]?([^'";\n,}]+)/gi);
            fontMatches?.forEach(f => {
                const cleaned = f.replace(/font-family:/i, '').trim();
                if (!cleaned.toLowerCase().includes('icon') && !cleaned.toLowerCase().includes('awesome')) {
                    fonts.add(cleaned);
                }
            });
        } catch {
            // Ignore CSS fetch failures
        }
    }

    // -----------------------------
    // 4. Google Fonts
    // -----------------------------
    $('link[href*="fonts.googleapis.com"]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;

        const urlObj = new URL(href, url);
        const family = urlObj.searchParams.get('family');
        if (family) {
            const fontName = family.split(':')[0].replace(/\+/g, ' ');
            fonts.add(fontName);
        }
    });

    // -----------------------------
    // 5. Logo detection
    // -----------------------------
    const logoImg = $(
        'header img, .logo img, img[alt*="logo" i], img[class*="logo" i], a[href="/"] img'
    )
        .first()
        .attr('src');

    logoUrl = logoImg ? resolveUrl(logoImg, url) : null;

    // -----------------------------
    // 6. Business name
    // -----------------------------
    const businessName =
        $('meta[property="og:site_name"]').attr('content') ||
        $('title').text().split(/[-|·]/)[0].trim() ||
        new URL(url).hostname;

    // -----------------------------
    // 7. Tagline
    // -----------------------------
    const tagline =
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        '';

    // -----------------------------
    // 8. Tone detection
    // -----------------------------
    const pageText = $('body').text().toLowerCase();
    const tone = detectTone(pageText, html);

    // -----------------------------
    // 9. Return raw data (NO FALLBACK COLORS)
    // -----------------------------
    return {
        topColors: Array.from(colors),
        fonts: Array.from(fonts),
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
