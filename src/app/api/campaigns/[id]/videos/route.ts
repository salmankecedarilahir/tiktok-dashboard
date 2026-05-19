import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getSessionOrThrow, requireRole, handleAuthError } from "@/lib/auth-helpers";

const log = createLogger({ module: "api/campaigns/[id]/videos" });

const videoSchema = z.object({
  videoTitle: z.string().min(1).max(300),
  videoUrl: z.string().url().nullable().optional(),
  postedAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  durationSeconds: z.coerce.number().int().min(0).max(600).nullable().optional(),
  views: z.coerce.number().int().min(0),
  likes: z.coerce.number().int().min(0),
  comments: z.coerce.number().int().min(0),
  shares: z.coerce.number().int().min(0),
  saves: z.coerce.number().int().min(0).default(0),
  watchTimeAvgSec: z.coerce.number().min(0).max(600).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.ADMIN, Role.EDITOR]);
    const { id: campaignId } = await params;
    const body = await req.json();
    const parsed = videoSchema.parse(body);

    // Verify campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const video = await prisma.campaignVideo.create({
      data: {
        campaignId,
        videoTitle: parsed.videoTitle,
        videoUrl: parsed.videoUrl ?? null,
        postedAt: new Date(parsed.postedAt),
        durationSeconds: parsed.durationSeconds ?? null,
        views: BigInt(parsed.views),
        likes: BigInt(parsed.likes),
        comments: BigInt(parsed.comments),
        shares: BigInt(parsed.shares),
        saves: BigInt(parsed.saves),
        watchTimeAvgSec: parsed.watchTimeAvgSec ?? null,
        notes: parsed.notes ?? null,
      },
    });

    log.info({ id: video.id, campaignId, title: video.videoTitle }, "Added video");

    return NextResponse.json({
      success: true,
      video: {
        ...video,
        views: Number(video.views),
        likes: Number(video.likes),
        comments: Number(video.comments),
        shares: Number(video.shares),
        saves: Number(video.saves),
        postedAt: video.postedAt.toISOString(),
        createdAt: video.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: err.issues },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to add video");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}