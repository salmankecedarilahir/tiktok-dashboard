import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getSessionOrThrow, handleAuthError } from "@/lib/auth-helpers";
import { calculateEngagement, extractTikTokVideoId } from "@/lib/utils";

const log = createLogger({ module: "api/inhouse" });

const queryParams = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2030),
});

const createSchema = z.object({
  tiktokUrl: z
    .string()
    .min(1)
    .refine(
      (u) => /tiktok\.com/i.test(u) && /\/video\//i.test(u),
      "URL harus mengandung tiktok.com dan /video/"
    ),
  caption: z.string().max(2000).nullable().optional(),
  weekNumber: z.coerce.number().int().min(1).max(4),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2030),
  views: z.coerce.number().int().min(0),
  likes: z.coerce.number().int().min(0),
  comments: z.coerce.number().int().min(0),
  shares: z.coerce.number().int().min(0),
  evaluation: z.string().max(5000).nullable().optional(),
  postedAt: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .nullable()
    .optional(),
});

function serializeVideo(v: {
  id: string;
  tiktokUrl: string;
  tiktokVideoId: string;
  caption: string | null;
  weekNumber: number;
  month: number;
  year: number;
  views: bigint;
  likes: bigint;
  comments: bigint;
  shares: bigint;
  evaluation: string | null;
  postedAt: Date | null;
  weeklyReportId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const views = Number(v.views);
  const likes = Number(v.likes);
  const comments = Number(v.comments);
  const shares = Number(v.shares);
  return {
    id: v.id,
    tiktokUrl: v.tiktokUrl,
    tiktokVideoId: v.tiktokVideoId,
    caption: v.caption,
    weekNumber: v.weekNumber,
    month: v.month,
    year: v.year,
    views,
    likes,
    comments,
    shares,
    evaluation: v.evaluation,
    postedAt: v.postedAt ? v.postedAt.toISOString() : null,
    weeklyReportId: v.weeklyReportId,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
    engagementRate: calculateEngagement(views, likes, comments, shares),
  };
}

export async function GET(req: NextRequest) {
  try {
    await getSessionOrThrow();
    const url = new URL(req.url);
    const parsed = queryParams.parse({
      month: url.searchParams.get("month"),
      year: url.searchParams.get("year"),
    });

    const [videos, reports] = await Promise.all([
      prisma.inhouseVideo.findMany({
        where: { month: parsed.month, year: parsed.year },
        orderBy: [{ weekNumber: "asc" }, { createdAt: "asc" }],
      }),
      prisma.inhouseWeeklyReport.findMany({
        where: { month: parsed.month, year: parsed.year },
      }),
    ]);

    const reportByWeek = new Map<
      number,
      {
        id: string;
        weekNumber: number;
        month: number;
        year: number;
        weekSummary: string | null;
        generatedAt: string | null;
      }
    >();
    for (const r of reports) {
      reportByWeek.set(r.weekNumber, {
        id: r.id,
        weekNumber: r.weekNumber,
        month: r.month,
        year: r.year,
        weekSummary: r.weekSummary,
        generatedAt: r.generatedAt ? r.generatedAt.toISOString() : null,
      });
    }

    const serialized = videos.map(serializeVideo);

    const weeks: Record<
      number,
      {
        weekNumber: number;
        weeklyReport: ReturnType<typeof reportByWeek.get> | null;
        videos: typeof serialized;
      }
    > = {};
    for (const w of [1, 2, 3, 4]) {
      weeks[w] = {
        weekNumber: w,
        weeklyReport: reportByWeek.get(w) ?? null,
        videos: serialized.filter((v) => v.weekNumber === w),
      };
    }

    const totalViews = serialized.reduce((s, v) => s + v.views, 0);
    const totalLikes = serialized.reduce((s, v) => s + v.likes, 0);
    const totalComments = serialized.reduce((s, v) => s + v.comments, 0);
    const totalShares = serialized.reduce((s, v) => s + v.shares, 0);
    const avgEngagement =
      serialized.length === 0
        ? 0
        : serialized.reduce((s, v) => s + v.engagementRate, 0) / serialized.length;

    return NextResponse.json({
      month: parsed.month,
      year: parsed.year,
      weeks,
      monthlyTotals: {
        videoCount: serialized.length,
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        avgEngagement,
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
    log.error({ error: msg }, "Failed to list inhouse videos");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await getSessionOrThrow();
    const body = await req.json();
    const parsed = createSchema.parse(body);

    const tiktokVideoId = extractTikTokVideoId(parsed.tiktokUrl);
    if (!tiktokVideoId) {
      return NextResponse.json(
        { error: "Tidak bisa extract video ID dari URL. Pastikan format URL valid." },
        { status: 400 }
      );
    }

    const duplicate = await prisma.inhouseVideo.findUnique({
      where: {
        tiktokVideoId_weekNumber_month_year: {
          tiktokVideoId,
          weekNumber: parsed.weekNumber,
          month: parsed.month,
          year: parsed.year,
        },
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Video sudah ada di week ini." },
        { status: 400 }
      );
    }

    const video = await prisma.$transaction(async (tx) => {
      const report = await tx.inhouseWeeklyReport.upsert({
        where: {
          weekNumber_month_year: {
            weekNumber: parsed.weekNumber,
            month: parsed.month,
            year: parsed.year,
          },
        },
        update: {},
        create: {
          weekNumber: parsed.weekNumber,
          month: parsed.month,
          year: parsed.year,
        },
      });

      return tx.inhouseVideo.create({
        data: {
          tiktokUrl: parsed.tiktokUrl,
          tiktokVideoId,
          caption: parsed.caption ?? null,
          weekNumber: parsed.weekNumber,
          month: parsed.month,
          year: parsed.year,
          views: BigInt(parsed.views),
          likes: BigInt(parsed.likes),
          comments: BigInt(parsed.comments),
          shares: BigInt(parsed.shares),
          evaluation: parsed.evaluation ?? null,
          postedAt: parsed.postedAt ? new Date(parsed.postedAt) : null,
          weeklyReportId: report.id,
        },
      });
    });

    log.info(
      {
        id: video.id,
        week: parsed.weekNumber,
        month: parsed.month,
        year: parsed.year,
      },
      "Created inhouse video"
    );

    return NextResponse.json({ success: true, video: serializeVideo(video) });
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
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Video sudah ada di week ini." },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to create inhouse video");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
