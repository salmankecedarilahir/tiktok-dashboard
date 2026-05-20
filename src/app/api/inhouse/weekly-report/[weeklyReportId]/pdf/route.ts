import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";

import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getSessionOrThrow, handleAuthError } from "@/lib/auth-helpers";
import {
  InhouseWeeklyReportPDF,
  InhouseWeeklyReportData,
} from "@/components/pdf/InhouseWeeklyReport";

const log = createLogger({ module: "api/inhouse/weekly-report/[id]/pdf" });

const MONTH_SLUGS = [
  "januari",
  "februari",
  "maret",
  "april",
  "mei",
  "juni",
  "juli",
  "agustus",
  "september",
  "oktober",
  "november",
  "desember",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ weeklyReportId: string }> }
) {
  try {
    await getSessionOrThrow();
    const { weeklyReportId } = await params;

    const report = await prisma.inhouseWeeklyReport.findUnique({
      where: { id: weeklyReportId },
      include: {
        videos: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Weekly report not found" },
        { status: 404 }
      );
    }

    const channelConfig = await prisma.channelConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    const data: InhouseWeeklyReportData = {
      weekNumber: report.weekNumber,
      month: report.month,
      year: report.year,
      weekSummary: report.weekSummary,
      generatedAt: new Date().toISOString(),
      videos: report.videos.map((v) => ({
        id: v.id,
        tiktokUrl: v.tiktokUrl,
        tiktokVideoId: v.tiktokVideoId,
        caption: v.caption,
        postedAt: v.postedAt ? v.postedAt.toISOString() : null,
        views: Number(v.views),
        likes: Number(v.likes),
        comments: Number(v.comments),
        shares: Number(v.shares),
        evaluation: v.evaluation,
      })),
      channelConfig: channelConfig
        ? {
            channelName: channelConfig.channelName,
            channelHandle: channelConfig.channelHandle,
          }
        : null,
    };

    const pdfStream = await renderToStream(InhouseWeeklyReportPDF({ data }));

    // Update generatedAt after successful render-prep (best effort)
    await prisma.inhouseWeeklyReport.update({
      where: { id: weeklyReportId },
      data: { generatedAt: new Date() },
    });

    log.info(
      {
        id: weeklyReportId,
        week: report.weekNumber,
        month: report.month,
        year: report.year,
        videoCount: data.videos.length,
      },
      "Generated inhouse weekly PDF"
    );

    const monthSlug = MONTH_SLUGS[report.month - 1] ?? String(report.month);
    const filename =
      "inhouse-week-" +
      report.weekNumber +
      "-" +
      monthSlug +
      "-" +
      report.year +
      ".pdf";

    return new NextResponse(pdfStream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="' + filename + '"',
      },
    });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to generate inhouse PDF");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
