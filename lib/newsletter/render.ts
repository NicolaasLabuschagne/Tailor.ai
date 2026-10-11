// Renders structured newsletter content into email-safe HTML (tables + inline styles).
// Client-safe so the layout catalog can render live previews in the browser.
import { Brand, DesignSpec, FontChoice, NewsletterContent, StoryRef } from './types';
import { contrast, ensureContrast, isDark, mix, normalizeHex, onColor } from './color';

const FONTS: Record<FontChoice, string> = {
  'classic-serif': "Georgia, 'Times New Roman', Times, serif",
  'display-serif': "'Playfair Display', Georgia, 'Times New Roman', serif",
  'modern-sans': "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  'grotesk': "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif",
};

const GOOGLE_FONTS =
  'https://fonts.googleapis.com/css2?family=Archivo:wght@600;800&family=Inter:wght@400;600;800&family=Playfair+Display:wght@600;700&display=swap';

export const UNSUBSCRIBE_TOKEN = '{{UNSUBSCRIBE_LINK}}';

type Tokens = ReturnType<typeof buildTokens>;

function buildTokens(d: DesignSpec) {
  const surface = normalizeHex(d.surface, '#ffffff');
  const background = normalizeHex(d.background, '#f3f3f3');
  const accent = normalizeHex(d.accent, '#1f3a5f');
  const ink = isDark(surface) ? '#f2f2f2' : '#1d1d1f';
  const muted = ensureContrast(isDark(surface) ? '#b4b4b8' : '#5f6368', surface, 4.5);
  const headerBg =
    d.headerTone === 'accent' ? accent : d.headerTone === 'dark' ? mix(accent, '#0b0c0f', 0.82) : surface;
  const headerInk = d.headerTone === 'light' ? ink : onColor(headerBg);
  const darkBand = mix(accent, '#0b0c0f', 0.78);
  return {
    surface,
    background,
    accent,
    ink,
    muted,
    rule: mix(surface, ink, 0.12),
    accentText: ensureContrast(accent, surface, 4.5),
    onAccent: onColor(accent),
    tint: mix(surface, accent, 0.08),
    headerBg,
    headerInk,
    headerMuted: mix(headerBg, headerInk, 0.72),
    darkBand,
    onDark: onColor(darkBand),
    pageMuted: ensureContrast('#6b6f76', background, 4.5),
    radius: { sharp: 0, soft: 6, round: 14 }[d.corner] ?? 6,
    heading: FONTS[d.headingFont] ?? FONTS['modern-sans'],
    body: FONTS[d.bodyFont] ?? FONTS['classic-serif'],
  };
}

// ---------- helpers ----------

function esc(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function url(href: unknown): string {
  const s = String(href ?? '').trim();
  return /^https?:\/\//i.test(s) ? esc(s) : '#';
}

function para(text: string, t: Tokens, size = 17, extra = ''): string {
  if (!text) return '';
  return `<p style="margin:0 0 18px;font-family:${t.body};font-size:${size}px;line-height:1.7;color:${t.ink};${extra}">${esc(text)}</p>`;
}

function button(label: string, href: string, bg: string, fg: string, t: Tokens, font = t.heading): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:${Math.min(t.radius, 8)}px;background:${bg};">
<a href="${url(href)}" style="display:inline-block;padding:14px 26px;font-family:${font};font-size:15px;font-weight:700;color:${fg};text-decoration:none;border-radius:${Math.min(t.radius, 8)}px;">${esc(label)} &rarr;</a>
</td></tr></table>`;
}

function image(src: string, alt: string, radius: number, width = 600): string {
  return `<img src="${url(src)}" alt="${esc(alt)}" width="${width}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;border-radius:${radius}px;">`;
}

function issueDate(content: NewsletterContent): string {
  const iso = content.issueDate;
  const date = iso ? new Date(iso) : new Date();
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function sourceLine(story: { sourceName: string; sourceUrl: string }, color: string, t: Tokens, label = 'Read the full story'): string {
  if (!story.sourceUrl) return '';
  return `<p style="margin:0 0 8px;font-family:${t.heading};font-size:14px;font-weight:600;">
<a href="${url(story.sourceUrl)}" style="color:${color};text-decoration:none;">${label}${story.sourceName ? ` at ${esc(story.sourceName)}` : ''} &rarr;</a></p>`;
}

function logoOrName(brand: Brand, color: string, t: Tokens, size: number, align: 'left' | 'center'): string {
  if (brand.logoUrl) {
    return `<img src="${url(brand.logoUrl)}" alt="${esc(brand.name)}" height="${size + 8}" style="display:${align === 'center' ? 'inline-block' : 'block'};height:${size + 8}px;width:auto;border:0;">`;
  }
  return `<span style="font-family:${t.heading};font-size:${size}px;font-weight:800;color:${color};letter-spacing:-0.01em;">${esc(brand.name)}</span>`;
}

function footer(brand: Brand, t: Tokens): string {
  return `<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
<tr><td class="px" align="center" style="padding:28px 40px 8px;font-family:${t.heading};font-size:12px;line-height:1.6;color:${t.pageMuted};">
You're receiving this because you subscribed to ${esc(brand.name)}.<br>
${brand.websiteUrl ? `<a href="${url(brand.websiteUrl)}" style="color:${t.pageMuted};text-decoration:underline;">Visit our website</a> &nbsp;&middot;&nbsp; ` : ''}<a href="${UNSUBSCRIBE_TOKEN}" style="color:${t.pageMuted};text-decoration:underline;">Unsubscribe</a>
</td></tr></table>`;
}

function shell(content: NewsletterContent, d: DesignSpec, t: Tokens, inner: string, brand: Brand, containerBg: string | null): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<title>${esc(content.subject)}</title>
<link href="${GOOGLE_FONTS}" rel="stylesheet">
<style>
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  img { border:0; outline:none; }
  a { text-decoration:none; }
  @media (max-width: 620px) {
    .container { width:100% !important; }
    .px { padding-left:22px !important; padding-right:22px !important; }
    .stack { display:block !important; width:100% !important; padding-left:0 !important; padding-right:0 !important; }
    .stack img { max-width:100% !important; }
    .stack-gap { padding:0 0 20px 0 !important; }
    .h1 { font-size:30px !important; line-height:1.15 !important; }
    .hide-sm { display:none !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${t.background};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(content.preheader)}${'&#847;&zwnj;&nbsp;'.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${t.background};">
<tr><td align="center" style="padding:28px 10px 36px;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;${containerBg ? `background:${containerBg};` : ''}${containerBg && d.layout !== 'cards' ? `border-radius:${t.radius}px;overflow:hidden;` : ''}">
${inner}
</table>
${footer(brand, t)}
</td></tr></table>
</body>
</html>`;
}

// ---------- layouts ----------

function editorial(c: NewsletterContent, d: DesignSpec, brand: Brand, t: Tokens): string {
  const hero = d.heroImage && c.lead.imageUrl;
  const rows: string[] = [];

  rows.push(`<tr><td class="px" align="center" style="padding:40px 48px 0;background:${t.headerBg};">
<p style="margin:0 0 14px;font-family:${t.heading};font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${t.headerMuted};">${esc(issueDate(c))}</p>
${logoOrName(brand, t.headerInk, t, 34, 'center')}
${brand.tagline ? `<p style="margin:10px 0 0;font-family:${t.body};font-size:15px;font-style:italic;color:${t.headerMuted};">${esc(brand.tagline)}</p>` : ''}
<div style="margin:26px 0 0;border-top:3px solid ${t.headerInk};border-bottom:1px solid ${t.headerInk};height:3px;line-height:3px;font-size:0;">&nbsp;</div>
</td></tr>`);

  rows.push(`<tr><td class="px" style="padding:36px 48px 0;">
${c.intro ? `<p style="margin:0 0 30px;font-family:${t.body};font-size:18px;line-height:1.6;font-style:italic;color:${t.muted};">${esc(c.intro)}</p>` : ''}
<p style="margin:0 0 12px;font-family:${t.heading};font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${t.accentText};">${esc(c.kicker)}</p>
<h1 class="h1" style="margin:0 0 14px;font-family:${t.heading};font-size:36px;line-height:1.15;font-weight:700;color:${t.ink};">${esc(c.lead.headline)}</h1>
${c.lead.dek ? `<p style="margin:0 0 26px;font-family:${t.body};font-size:19px;line-height:1.5;color:${t.muted};">${esc(c.lead.dek)}</p>` : ''}
</td></tr>`);

  if (hero) rows.push(`<tr><td class="px" style="padding:0 48px 28px;">${image(c.lead.imageUrl!, c.lead.headline, t.radius, 504)}</td></tr>`);

  rows.push(`<tr><td class="px" style="padding:0 48px;">
${c.lead.paragraphs.map((p) => para(p, t, 17)).join('')}
${c.keyStat ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 28px;"><tr>
<td style="border-left:4px solid ${t.accent};padding:6px 0 6px 22px;">
<p style="margin:0;font-family:${t.heading};font-size:44px;line-height:1.05;font-weight:700;color:${t.accentText};">${esc(c.keyStat.value)}</p>
<p style="margin:6px 0 0;font-family:${t.body};font-size:15px;line-height:1.5;color:${t.muted};">${esc(c.keyStat.label)}</p>
</td></tr></table>` : ''}
${para(c.connection, t)}
${sourceLine(c.lead, t.accentText, t)}
</td></tr>`);

  if (c.stories.length) {
    rows.push(`<tr><td class="px" style="padding:34px 48px 6px;">
<div style="border-top:1px solid ${t.ink};padding-top:14px;font-family:${t.heading};font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${t.ink};">Also worth knowing</div>
</td></tr>`);
    c.stories.forEach((s, i) => {
      rows.push(`<tr><td class="px" style="padding:18px 48px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="top" width="54" style="width:54px;font-family:${t.heading};font-size:26px;line-height:1.1;font-weight:700;color:${t.accentText};">${String(i + 1).padStart(2, '0')}</td>
<td valign="top" style="padding-bottom:18px;border-bottom:1px solid ${t.rule};">
<a href="${url(s.sourceUrl)}" style="font-family:${t.heading};font-size:19px;line-height:1.3;font-weight:700;color:${t.ink};text-decoration:none;">${esc(s.headline)}</a>
<p style="margin:8px 0 6px;font-family:${t.body};font-size:15px;line-height:1.6;color:${t.muted};">${esc(s.summary)}</p>
${s.sourceName ? `<p style="margin:0;font-family:${t.heading};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${t.muted};">${esc(s.sourceName)}</p>` : ''}
</td></tr></table>
</td></tr>`);
    });
  }

  rows.push(`<tr><td class="px" style="padding:36px 48px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${t.tint};border-radius:${t.radius}px;"><tr><td style="padding:28px 30px;">
<p style="margin:0 0 6px;font-family:${t.heading};font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${t.accentText};">From ${esc(brand.name)}</p>
<p style="margin:0 0 10px;font-family:${t.heading};font-size:23px;line-height:1.25;font-weight:700;color:${t.ink};">${esc(c.offer.headline)}</p>
${para(c.offer.body, t, 16, 'margin-bottom:20px;')}
${button(c.offer.ctaLabel, brand.websiteUrl, t.accent, t.onAccent, t)}
</td></tr></table>
</td></tr>`);

  rows.push(`<tr><td class="px" style="padding:30px 48px 44px;">
<p style="margin:0;font-family:${t.body};font-size:17px;font-style:italic;color:${t.ink};">${esc(c.signoff)}</p>
</td></tr>`);

  return rows.join('\n');
}

function magazine(c: NewsletterContent, d: DesignSpec, brand: Brand, t: Tokens): string {
  const hero = d.heroImage && c.lead.imageUrl;
  const bandBorder = d.headerTone === 'light' ? `border-bottom:6px solid ${t.accent};` : '';
  const rows: string[] = [];

  rows.push(`<tr><td class="px" style="padding:26px 40px 40px;background:${t.headerBg};${bandBorder}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle">${logoOrName(brand, t.headerInk, t, 20, 'left')}</td>
<td valign="middle" align="right" style="font-family:${t.heading};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${t.headerMuted};">${esc(issueDate(c))}</td>
</tr></table>
<p style="margin:44px 0 14px;font-family:${t.heading};font-size:13px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:${d.headerTone === 'light' ? t.accentText : t.headerMuted};">${esc(c.kicker)}</p>
<h1 class="h1" style="margin:0 0 16px;font-family:${t.heading};font-size:42px;line-height:1.08;font-weight:800;letter-spacing:-0.02em;color:${t.headerInk};">${esc(c.lead.headline)}</h1>
${c.lead.dek ? `<p style="margin:0;font-family:${t.body};font-size:18px;line-height:1.5;color:${t.headerMuted};">${esc(c.lead.dek)}</p>` : ''}
</td></tr>`);

  if (hero) rows.push(`<tr><td style="padding:0;">${image(c.lead.imageUrl!, c.lead.headline, 0)}</td></tr>`);

  rows.push(`<tr><td class="px" style="padding:36px 40px 4px;">
${c.intro ? `<p style="margin:0 0 22px;font-family:${t.heading};font-size:19px;line-height:1.55;font-weight:600;color:${t.ink};">${esc(c.intro)}</p>` : ''}
${c.lead.paragraphs.map((p) => para(p, t, 16)).join('')}
</td></tr>`);

  if (c.keyStat) {
    rows.push(`<tr><td class="px" style="padding:8px 40px 26px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${t.accent};border-radius:${t.radius}px;"><tr>
<td style="padding:26px 30px;">
<p style="margin:0;font-family:${t.heading};font-size:54px;line-height:1;font-weight:800;letter-spacing:-0.02em;color:${t.onAccent};">${esc(c.keyStat.value)}</p>
<p style="margin:10px 0 0;font-family:${t.heading};font-size:15px;line-height:1.5;font-weight:600;color:${t.onAccent};opacity:0.9;">${esc(c.keyStat.label)}</p>
</td></tr></table></td></tr>`);
  }

  rows.push(`<tr><td class="px" style="padding:0 40px 8px;">
${para(c.connection, t, 16)}
${sourceLine(c.lead, t.accentText, t)}
</td></tr>`);

  if (c.stories.length) {
    rows.push(`<tr><td class="px" style="padding:30px 40px 18px;">
<div style="border-left:6px solid ${t.accent};padding-left:12px;font-family:${t.heading};font-size:15px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:${t.ink};">More stories</div>
</td></tr>`);
    for (let i = 0; i < c.stories.length; i += 2) {
      const pair = c.stories.slice(i, i + 2);
      const cell = (s: StoryRef, pos: 'left' | 'right' | 'full') => `<td class="stack ${pos === 'left' ? 'stack-gap' : ''}" valign="top" width="${pos === 'full' ? '100%' : '50%'}" style="padding:${pos === 'left' ? '0 12px 0 0' : pos === 'right' ? '0 0 0 12px' : '0'};">
${s.imageUrl ? image(s.imageUrl, s.headline, t.radius, pos === 'full' ? 520 : 248) : `<div style="height:6px;background:${t.accent};border-radius:${t.radius}px;font-size:0;line-height:0;">&nbsp;</div>`}
${s.sourceName ? `<p style="margin:14px 0 6px;font-family:${t.heading};font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:${t.accentText};">${esc(s.sourceName)}</p>` : '<div style="height:14px"></div>'}
<a href="${url(s.sourceUrl)}" style="font-family:${t.heading};font-size:19px;line-height:1.25;font-weight:800;color:${t.ink};text-decoration:none;">${esc(s.headline)}</a>
<p style="margin:8px 0 0;font-family:${t.body};font-size:14px;line-height:1.6;color:${t.muted};">${esc(s.summary)}</p>
</td>`;
      rows.push(`<tr><td class="px" style="padding:0 40px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
${pair.length === 2 ? cell(pair[0], 'left') + cell(pair[1], 'right') : cell(pair[0], 'full')}
</tr></table></td></tr>`);
    }
  }

  const ctaBg = contrast(t.accent, t.darkBand) >= 3 ? t.accent : '#ffffff';
  rows.push(`<tr><td class="px" style="padding:36px 40px;background:${t.darkBand};">
<p style="margin:0 0 8px;font-family:${t.heading};font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:${mix(t.darkBand, t.onDark, 0.7)};">From ${esc(brand.name)}</p>
<p style="margin:0 0 12px;font-family:${t.heading};font-size:26px;line-height:1.2;font-weight:800;color:${t.onDark};">${esc(c.offer.headline)}</p>
<p style="margin:0 0 22px;font-family:${t.body};font-size:16px;line-height:1.65;color:${mix(t.darkBand, t.onDark, 0.85)};">${esc(c.offer.body)}</p>
${button(c.offer.ctaLabel, brand.websiteUrl, ctaBg, onColor(ctaBg), t)}
<p style="margin:28px 0 0;font-family:${t.body};font-size:15px;font-style:italic;color:${mix(t.darkBand, t.onDark, 0.8)};">${esc(c.signoff)}</p>
</td></tr>`);

  return rows.join('\n');
}

function cards(c: NewsletterContent, d: DesignSpec, brand: Brand, t: Tokens): string {
  const hero = d.heroImage && c.lead.imageUrl;
  const card = (inner: string, opts: { bg?: string; pad?: string; border?: boolean } = {}) =>
    `<tr><td style="padding:0 0 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${opts.bg ?? t.surface};border-radius:${t.radius}px;${opts.border === false ? '' : `border:1px solid ${mix(t.background, '#000000', 0.08)};`}overflow:hidden;">${inner}</table></td></tr>`;
  const headerColor = ensureContrast(t.ink, t.background, 4.5);
  const rows: string[] = [];

  rows.push(`<tr><td style="padding:4px 6px 22px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle">${logoOrName(brand, headerColor, t, 20, 'left')}</td>
<td valign="middle" align="right" style="font-family:${t.heading};font-size:13px;color:${t.pageMuted};">${esc(issueDate(c))}</td>
</tr></table></td></tr>`);

  rows.push(card(`${hero ? `<tr><td style="padding:0;">${image(c.lead.imageUrl!, c.lead.headline, 0)}</td></tr>` : ''}
<tr><td class="px" style="padding:30px 34px 14px;">
<span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${t.tint};font-family:${t.heading};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${t.accentText};">${esc(c.kicker)}</span>
<h1 class="h1" style="margin:18px 0 12px;font-family:${t.heading};font-size:31px;line-height:1.18;font-weight:800;letter-spacing:-0.015em;color:${t.ink};">${esc(c.lead.headline)}</h1>
${c.lead.dek ? `<p style="margin:0 0 22px;font-family:${t.body};font-size:17px;line-height:1.55;color:${t.muted};">${esc(c.lead.dek)}</p>` : ''}
${c.intro ? para(c.intro, t, 16, `font-weight:600;`) : ''}
${c.lead.paragraphs.map((p) => para(p, t, 16)).join('')}
${para(c.connection, t, 16)}
${sourceLine(c.lead, t.accentText, t)}
</td></tr>`));

  if (c.keyStat) {
    rows.push(card(`<tr><td class="px" style="padding:26px 34px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="stack stack-gap" valign="middle" width="42%" style="font-family:${t.heading};font-size:46px;line-height:1;font-weight:800;letter-spacing:-0.02em;color:${t.onAccent};">${esc(c.keyStat.value)}</td>
<td class="stack" valign="middle" style="font-family:${t.heading};font-size:15px;line-height:1.5;font-weight:600;color:${t.onAccent};">${esc(c.keyStat.label)}</td>
</tr></table></td></tr>`, { bg: t.accent, border: false }));
  }

  if (c.stories.length) {
    const items = c.stories.map((s, i) => `<tr><td style="padding:${i === 0 ? '0' : '18px'} 0 18px;${i < c.stories.length - 1 ? `border-bottom:1px solid ${t.rule};` : ''}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
${s.imageUrl ? `<td class="hide-sm" valign="top" width="128" style="width:128px;padding-right:18px;"><img src="${url(s.imageUrl)}" alt="${esc(s.headline)}" width="110" height="82" style="display:block;width:110px;height:82px;object-fit:cover;border-radius:${Math.min(t.radius, 10)}px;border:0;"></td>` : ''}
<td valign="top">
<a href="${url(s.sourceUrl)}" style="font-family:${t.heading};font-size:17px;line-height:1.3;font-weight:700;color:${t.ink};text-decoration:none;">${esc(s.headline)}</a>
<p style="margin:6px 0 6px;font-family:${t.body};font-size:14px;line-height:1.55;color:${t.muted};">${esc(s.summary)}</p>
${s.sourceName ? `<a href="${url(s.sourceUrl)}" style="font-family:${t.heading};font-size:13px;font-weight:600;color:${t.accentText};text-decoration:none;">${esc(s.sourceName)} &rarr;</a>` : ''}
</td></tr></table></td></tr>`).join('');
    rows.push(card(`<tr><td class="px" style="padding:26px 34px 8px;">
<p style="margin:0 0 18px;font-family:${t.heading};font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:${t.ink};">Also worth knowing</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>
</td></tr>`));
  }

  rows.push(card(`<tr><td class="px" style="padding:30px 34px;">
<p style="margin:0 0 10px;font-family:${t.heading};font-size:23px;line-height:1.25;font-weight:800;color:${t.ink};">${esc(c.offer.headline)}</p>
${para(c.offer.body, t, 16, 'margin-bottom:22px;')}
${button(c.offer.ctaLabel, brand.websiteUrl, t.accent, t.onAccent, t)}
<p style="margin:26px 0 0;font-family:${t.body};font-size:15px;color:${t.muted};">${esc(c.signoff)}</p>
</td></tr>`, { bg: t.tint }));

  return rows.join('\n');
}

function letter(c: NewsletterContent, d: DesignSpec, brand: Brand, t: Tokens): string {
  const hero = d.heroImage && c.lead.imageUrl;
  const rows: string[] = [];

  rows.push(`<tr><td class="px" style="padding:44px 56px 0;background:${t.headerBg};">
${logoOrName(brand, t.headerInk, t, 20, 'left')}
${brand.tagline ? `<p style="margin:6px 0 0;font-family:${t.body};font-size:14px;color:${t.headerMuted};">${esc(brand.tagline)}</p>` : ''}
<div style="margin:24px 0 0;border-top:1px solid ${t.rule};font-size:0;line-height:0;">&nbsp;</div>
</td></tr>`);

  rows.push(`<tr><td class="px" style="padding:28px 56px 0;">
<p style="margin:0 0 26px;font-family:${t.heading};font-size:13px;color:${t.muted};">${esc(issueDate(c))}</p>
${para(c.intro, t, 18)}
<h2 style="margin:12px 0 16px;font-family:${t.heading};font-size:26px;line-height:1.25;font-weight:700;color:${t.ink};">${esc(c.lead.headline)}</h2>
${hero ? `<div style="margin:0 0 22px;">${image(c.lead.imageUrl!, c.lead.headline, t.radius, 488)}</div>` : ''}
${c.lead.paragraphs.map((p) => para(p, t, 18)).join('')}
${c.keyStat ? `<p style="margin:4px 0 22px;padding:4px 0 4px 18px;border-left:3px solid ${t.accent};font-family:${t.body};font-size:18px;line-height:1.6;color:${t.ink};"><strong style="color:${t.accentText};">${esc(c.keyStat.value)}</strong> &mdash; ${esc(c.keyStat.label)}</p>` : ''}
${para(c.connection, t, 18)}
${c.lead.sourceUrl ? `<p style="margin:0 0 30px;font-family:${t.body};font-size:16px;color:${t.muted};">Source: <a href="${url(c.lead.sourceUrl)}" style="color:${t.accentText};text-decoration:underline;">${esc(c.lead.sourceName || 'original article')}</a></p>` : ''}
</td></tr>`);

  if (c.stories.length) {
    rows.push(`<tr><td class="px" style="padding:0 56px 10px;">
<p style="margin:0 0 14px;font-family:${t.heading};font-size:18px;font-weight:700;color:${t.ink};">Also on my radar</p>
${c.stories.map((s) => `<p style="margin:0 0 16px;font-family:${t.body};font-size:17px;line-height:1.65;color:${t.ink};">
<a href="${url(s.sourceUrl)}" style="color:${t.accentText};font-weight:700;text-decoration:underline;">${esc(s.headline)}</a> &mdash; ${esc(s.summary)}${s.sourceName ? ` <span style="color:${t.muted};">(${esc(s.sourceName)})</span>` : ''}</p>`).join('')}
</td></tr>`);
  }

  rows.push(`<tr><td class="px" style="padding:16px 56px 48px;">
<p style="margin:0 0 30px;font-family:${t.body};font-size:18px;color:${t.ink};">${esc(c.signoff)}</p>
<div style="border-top:1px solid ${t.rule};padding-top:24px;">
<p style="margin:0 0 6px;font-family:${t.heading};font-size:16px;font-weight:700;color:${t.ink};">P.S. ${esc(c.offer.headline)}</p>
${para(c.offer.body, t, 16, `color:${t.muted};`)}
${button(c.offer.ctaLabel, brand.websiteUrl, t.accent, t.onAccent, t)}
</div>
</td></tr>`);

  return rows.join('\n');
}

// ---------- entry ----------

export function renderNewsletter(content: NewsletterContent, design: DesignSpec, brand: Brand): string {
  const t = buildTokens(design);
  const c: NewsletterContent = {
    ...content,
    lead: { ...content.lead, paragraphs: content.lead?.paragraphs ?? [] },
    stories: content.stories ?? [],
  };
  switch (design.layout) {
    case 'magazine':
      return shell(c, design, t, magazine(c, design, brand, t), brand, t.surface);
    case 'cards':
      return shell(c, design, t, cards(c, design, brand, t), brand, null);
    case 'letter':
      return shell(c, design, t, letter(c, design, brand, t), brand, t.surface);
    case 'editorial':
    default:
      return shell(c, design, t, editorial(c, design, brand, t), brand, t.surface);
  }
}

// Placeholder issue used to preview layouts before any newsletter exists
export const SAMPLE_CONTENT: NewsletterContent = {
  subject: 'What this week means for your business',
  preheader: 'The one story worth your attention, plus three quick reads.',
  kicker: 'This week',
  intro: 'A quieter week on the surface, but one development is worth a closer look before it reaches your inbox from everyone else.',
  lead: {
    headline: 'Small businesses are rethinking how they reach customers',
    dek: 'New data shows owners shifting budget from ads to owned channels like email.',
    paragraphs: [
      'A survey of more than 2,000 owners found that most plan to spend less on paid social next year, citing rising costs and falling reach.',
      'The money is moving toward channels businesses control directly. Email lists, loyalty programs and community events all saw planned increases.',
    ],
    sourceName: 'Example News',
    sourceUrl: 'https://example.com',
  },
  keyStat: { value: '62%', label: 'of owners plan to grow their email list this year' },
  stories: [
    { headline: 'Local search updates reward fresh reviews', summary: 'Recent reviews now carry more weight in map results.', sourceName: 'Example Daily', sourceUrl: 'https://example.com' },
    { headline: 'Card fees are set to change in the spring', summary: 'What the new interchange rules mean for your margins.', sourceName: 'Example Times', sourceUrl: 'https://example.com' },
    { headline: 'Shoppers say speed beats price', summary: 'Same-day pickup is now a deciding factor for most buyers.', sourceName: 'Example Wire', sourceUrl: 'https://example.com' },
  ],
  connection: 'It is the same shift we have been helping clients make: fewer rented audiences, more relationships you own.',
  offer: { headline: 'A free audit of your customer channels', body: 'Book a 20-minute call this month and we will map where your customers actually come from.', ctaLabel: 'Book your audit' },
  signoff: 'Talk soon',
};
