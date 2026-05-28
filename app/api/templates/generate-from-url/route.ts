import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import fetch from 'node-fetch';
import { extractBrandData } from '@/lib/brandScraper';
import { generateContent } from '@/lib/groq';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    let finalUrl = url;
    if (!url.startsWith('http')) finalUrl = 'https://' + url;

    // Use AbortController for timeout since node-fetch timeout option is not in RequestInit types
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(finalUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Tailor/1.0)' },
      signal: controller.signal as any
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: "We couldn't reach that URL. Make sure your site is public." }, { status: 400 });
    }

    const html = await response.text();
    const brandData = extractBrandData(html, finalUrl);

    if (brandData.topColors.length === 0) {
       return NextResponse.json({ error: "We couldn't detect brand colors. Try the visual editor instead." }, { status: 400 });
    }

    const systemPrompt = "You are an expert HTML email designer. Generate a complete, beautiful newsletter HTML template based on the brand data provided. Use ONLY inline CSS (no <style> blocks) so it works in all email clients. The template must include these exact merge tag placeholders: {{HEADLINE}}, {{PARAGRAPH_1}}, {{PARAGRAPH_2}}, {{PARAGRAPH_3}}, {{OFFER_TEXT}}, {{CTA_LABEL}}, {{CTA_URL}}, {{TOPIC_LABEL}}, {{UNSUBSCRIBE_LINK}}. Return ONLY the HTML. Nothing else.";

    const userPrompt = `Generate a newsletter template for this brand:
Business name: ${brandData.businessName}
Primary color: ${brandData.topColors[0] ?? '#1a1a1a'}
Secondary color: ${brandData.topColors[1] ?? '#f5f5f5'}
Accent color: ${brandData.topColors[2] ?? '#666'}
Heading font: ${brandData.fonts[0] ?? 'Arial, sans-serif'}
Body font: ${brandData.fonts[1] ?? brandData.fonts[0] ?? 'Arial, sans-serif'}
Logo URL: ${brandData.logoUrl ?? 'none'}
Style tone: ${brandData.tone}
Tagline: ${brandData.tagline}

Design requirements:
- Max width 600px, centered
- Header with logo (if provided) and business name
- Clean section for topic label above headline
- Room for 3 body paragraphs
- Prominent offer/CTA block using primary color
- Simple footer with unsubscribe link
- Mobile-friendly (single column)
- All merge tags must be present exactly as shown`;

    const templateHtml = await generateContent(systemPrompt, userPrompt);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { businessProfile: true }
    });

    if (!user?.businessProfile) throw new Error('Profile missing');

    const domain = new URL(finalUrl).hostname;
    const slot = await prisma.templateSlot.create({
      data: {
        businessProfileId: user.businessProfile.id,
        name: `Generated from ${domain}`,
        html: templateHtml,
        source: 'AI_GENERATED'
      }
    });

    return NextResponse.json({
      templateHtml,
      brandData,
      slotId: slot.id
    });

  } catch (error: any) {
    if (error.name === 'AbortError') {
       return NextResponse.json({ error: "Request timed out. The website is taking too long to respond." }, { status: 408 });
    }
    console.error('AI Template Gen Error:', error);
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}
