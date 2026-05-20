import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getSessionOrThrow, handleAuthError } from "@/lib/auth-helpers";
import { calculateEngagement } from "@/lib/utils";

const log = createLogger({ module: "api/inhouse/[id]" });

const patchSchema = z.object({
  views: z.coerce.number().int().min(0).optional(),
  likes: z.coerce.number().int().min(0).optional(),
  comments: z.coerce.number().int().min(0).optional(),
  shares: z.coerce.number().int().min(0).optional(),
  caption: z.string().max(2000).nullable().optional(),
  evaluation: z.string().max(5000).nullable().optional(),
  postedAt: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .nullable()
    .optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionOrThrow();
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.parse(body);

    const data: Prisma.InhouseVideoUpdateInput = {};
    if (parsed.views !== undefined) data.views = BigInt(parsed.views);
    if (parsed.likes !== undefined) data.likes = BigInt(parsed.likes);
    if (parsed.comments !== undefined) data.comments = BigInt(parsed.comments);
    if (parsed.shares !== undefined) data.shares = BigInt(parsed.shares);
    if (parsed.caption !== undefined) data.caption = parsed.caption;
    if (parsed.evaluation !== undefined) data.evaluation = parsed.evaluation;
    if (parsed.postedAt !== undefined) {
      data.postedAt = parsed.postedAt ? new Date(parsed.postedAt) : null;
    }

    const video = await prisma.inhouseVideo.update({
      where: { id },
      data,
    });

    const views = Number(video.views);
    const likes = Number(video.likes);
    const comments = Number(video.comments);
    const shares = Number(video.shares);

    log.info({ id }, "Updated inhouse video");

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        tiktokUrl: video.tiktokUrl,
        tiktokVideoId: video.tiktokVideoId,
        caption: video.caption,
        weekNumber: video.weekNumber,
        month: video.month,
        year: video.year,
        views,
        likes,
        comments,
        shares,
        evaluation: video.evaluation,
        postedAt: video.postedAt ? video.postedAt.toISOString() : null,
        weeklyReportId: video.weeklyReportId,
        createdAt: video.createdAt.toISOString(),
        updatedAt: video.updatedAt.toISOString(),
        engagementRate: calculateEngagement(views, likes, comments, shares),
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
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to update inhouse video");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionOrThrow();
    const { id } = await params;
    await prisma.inhouseVideo.delete({ where: { id } });
    log.info({ id }, "Deleted inhouse video");
    return NextResponse.json({ success: true });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    // DELETE idempotent: kalau record sudah tidak ada (mis. user double-click
    // atau dihapus di tab lain), anggap sukses biar UX nggak nampilin error.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      log.info("Inhouse video already deleted, treating as success");
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to delete inhouse video");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
