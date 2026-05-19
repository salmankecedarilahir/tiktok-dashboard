import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { CampaignReportPDF, CampaignReportData } from "@/components/pdf/CampaignReport";

const log = createLogger({ module: "api/campaigns/[id]/report" });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        videos: { orderBy: { postedAt: "desc" } },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.videos.length === 0) {
      return NextResponse.json(
        { error: "Campaign belum punya video. Add video dulu sebelum generate report." },
        { status: 400 }
      );
    }

    const channelConfig = await prisma.channelConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    const dailyMetrics = await prisma.dailyMetric.findMany({
      orderBy: { date: "asc" },
    });

    let channelMetrics: CampaignReportData["channelMetrics"] = null;

    if (dailyMetrics.length > 0) {
      const totalViews365d = dailyMetrics.reduce(
        (sum, m) => sum + Number(m.videoViews),
        0
      );

      // Last 30 days array (for sparkline)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const last30d = dailyMetrics.filter((m) => m.date >= thirtyDaysAgo);
      const last30dViews = last30d.reduce(
        (sum, m) => sum + Number(m.videoViews),
        0
      );

      // Build sparkline data array
      const sparklineData = last30d.map((m) => ({
        date: m.date.toISOString(),
        views: Number(m.videoViews),
      }));

      // Top viral day from full 365d
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
        sparklineData,
      };
    }

    const data: CampaignReportData = {
      brandName: campaign.brandName,
      campaignName: campaign.campaignName,
      packageType: campaign.packageType,
      startDate: campaign.startDate.toISOString(),
      endDate: campaign.endDate.toISOString(),
      notes: campaign.notes,
      videos: campaign.videos.map((v) => ({
        id: v.id,
        videoTitle: v.videoTitle,
        videoUrl: v.videoUrl,
        postedAt: v.postedAt.toISOString(),
        durationSeconds: v.durationSeconds,
        views: Number(v.views),
        likes: Number(v.likes),
        comments: Number(v.comments),
        shares: Number(v.shares),
        saves: Number(v.saves),
        watchTimeAvgSec: v.watchTimeAvgSec,
      })),
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

    const pdfStream = await renderToStream(CampaignReportPDF({ data }));

    log.info(
      {
        campaignId: id,
        brand: campaign.brandName,
        videoCount: data.videos.length,
        sparklinePoints: channelMetrics?.sparklineData.length ?? 0,
      },
      "Generated PDF with sparkline"
    );

    const filename =
      campaign.brandName.replace(/[^a-z0-9]/gi, "_") +
      "_" +
      campaign.campaignName.replace(/[^a-z0-9]/gi, "_") +
      "_Report.pdf";

    // @ts-expect-error - Node stream to Response body
    return new NextResponse(pdfStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="' + filename + '"',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to generate PDF");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}