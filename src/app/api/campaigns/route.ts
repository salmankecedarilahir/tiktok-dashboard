import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "api/campaigns" });

const PACKAGE_TYPES = ["Mapres", "Kating Gaul", "Cumlaude", "Custom"] as const;

const campaignSchema = z.object({
  brandName: z.string().min(1).max(100),
  brandLogoUrl: z.string().url().nullable().optional(),
  campaignName: z.string().min(1).max(200),
  packageType: z.enum(PACKAGE_TYPES).nullable().optional(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        _count: { select: { videos: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      campaigns: campaigns.map((c) => ({
        id: c.id,
        brandName: c.brandName,
        brandLogoUrl: c.brandLogoUrl,
        campaignName: c.campaignName,
        packageType: c.packageType,
        startDate: c.startDate.toISOString(),
        endDate: c.endDate.toISOString(),
        notes: c.notes,
        videoCount: c._count.videos,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to list campaigns");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = campaignSchema.parse(body);

    const startDate = new Date(parsed.startDate);
    const endDate = new Date(parsed.endDate);

    if (endDate < startDate) {
      return NextResponse.json(
        { error: "End date harus setelah start date" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        brandName: parsed.brandName,
        brandLogoUrl: parsed.brandLogoUrl ?? null,
        campaignName: parsed.campaignName,
        packageType: parsed.packageType ?? null,
        startDate,
        endDate,
        notes: parsed.notes ?? null,
      },
    });

    log.info({ id: campaign.id, brand: campaign.brandName }, "Created campaign");

    return NextResponse.json({ success: true, campaign });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: err.issues },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to create campaign");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}