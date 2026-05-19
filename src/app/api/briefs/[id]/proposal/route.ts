import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getSessionOrThrow, requireRole, handleAuthError } from "@/lib/auth-helpers";
import { ProposalReportPDF, ProposalReportData } from "@/components/pdf/ProposalReport";

const log = createLogger({ module: "api/briefs/[id]/proposal" });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.ADMIN, Role.EDITOR]);
    const { id } = await params;

    const brief = await prisma.brief.findUnique({
      where: { id },
    });

    if (!brief) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    // Validation: required fields untuk proposal
    if (!brief.campaignName || !brief.startDate || !brief.endDate) {
      return NextResponse.json(
        {
          error: "Brief belum lengkap. Wajib ada Campaign Name, Start Date, End Date sebelum generate proposal.",
        },
        { status: 400 }
      );
    }

    // Fetch channel config (singleton)
    const channelConfig = await prisma.channelConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    // Fetch daily metrics aggregate
    const dailyMetrics = await prisma.dailyMetric.findMany({
      orderBy: { date: "asc" },
    });

    let channelMetrics: ProposalReportData["channelMetrics"] = null;

    if (dailyMetrics.length > 0) {
      const totalViews365d = dailyMetrics.reduce(
        (sum, m) => sum + Number(m.videoViews),
        0
      );

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const last30d = dailyMetrics.filter((m) => m.date >= thirtyDaysAgo);
      const last30dViews = last30d.reduce(
        (sum, m) => sum + Number(m.videoViews),
        0
      );

      const topDay = dailyMetrics.reduce(
        (max, m) => (Number(m.videoViews) > Number(max.videoViews) ? m : max),
        dailyMetrics[0]!
      );

      channelMetrics = {
        totalViews365d,
        last30dViews,
        avgViewsPerDay: Math.round(totalViews365d / dailyMetrics.length),
        topViralDay: {
          date: topDay.date.toISOString(),
          views: Number(topDay.videoViews),
        },
      };
    }

    // Build proposal data
    const data: ProposalReportData = {
      brandName: brief.brandName,
      brandContact: brief.brandContact,
      campaignName: brief.campaignName,
      description: brief.description,
      packageType: brief.packageType,
      customPrice: brief.customPrice,
      deliverables: brief.deliverables,
      startDate: brief.startDate.toISOString(),
      endDate: brief.endDate.toISOString(),
      viewsGuarantee: brief.viewsGuarantee,
      requirements: brief.requirements,
      channelConfig: channelConfig
        ? {
            channelName: channelConfig.channelName,
            channelHandle: channelConfig.channelHandle,
            totalFollowers: channelConfig.totalFollowers,
            brandColor: channelConfig.brandColor,
            tagline: channelConfig.tagline,
            femalePercent: channelConfig.femalePercent,
            malePercent: channelConfig.malePercent,
            age18_24Percent: channelConfig.age18_24Percent,
            age25_34Percent: channelConfig.age25_34Percent,
            age35plusPercent: channelConfig.age35plusPercent,
          }
        : null,
      channelMetrics,
      generatedAt: new Date().toISOString(),
    };

    const pdfStream = await renderToStream(ProposalReportPDF({ data }));

    log.info(
      {
        briefId: id,
        brand: brief.brandName,
        campaign: brief.campaignName,
      },
      "Generated proposal PDF"
    );

    const filename =
      "Proposal_" +
      brief.brandName.replace(/[^a-z0-9]/gi, "_") +
      "_" +
      brief.campaignName.replace(/[^a-z0-9]/gi, "_") +
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
    log.error({ error: msg }, "Failed to generate proposal PDF");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}