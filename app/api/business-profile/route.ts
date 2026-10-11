import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET — Fetch profile
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const profile = await prisma.businessProfile.findUnique({
      where: { userId: user.id },
      include: {
        newsSource: true,
        templates: true,
      },
    });

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error("GET /api/business-profile failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// POST — Create/update profile
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      keywords,
      categories,
      excludedDomains,
      ...profileData
    } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const profile = await prisma.businessProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: { ...profileData, userId: user.id },
    });

    if (keywords) {
      await prisma.newsSource.upsert({
        where: { businessProfileId: profile.id },
        update: {
          keywords,
          categories: categories || [],
          excludedDomains: excludedDomains || [],
        },
        create: {
          businessProfileId: profile.id,
          keywords,
          categories: categories || [],
          excludedDomains: excludedDomains || [],
        },
      });
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error("POST /api/business-profile failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
