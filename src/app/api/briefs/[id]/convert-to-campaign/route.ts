import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "api/briefs/[id]/convert-to-campaign" });

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const brief = await prisma.brief.findUnique({ where: { id } });

    if (!brief) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    if (brief.campaignId) {
      return NextResponse.json(
        { error: "Brief sudah terhubung ke campaign", campaignId: brief.campaignId },
        { status: 400 }
      );
    }

    if (!brief.campaignName || !brief.startDate || !brief.endDate) {
      return NextResponse.json(
        { error: "Brief belum lengkap. Wajib ada campaignName, startDate, endDate sebelum convert." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.create({
        data: {
          brandName: brief.brandName,
          campaignName: brief.campaignName!,
          packageType: brief.packageType,
          startDate: brief.startDate!,
          endDate: brief.endDate!,
          notes: brief.description,
        },
      });

      const updatedBrief = await tx.brief.update({
        where: { id },
        data: {
          campaignId: campaign.id,
          status: "ACTIVE",
        },
      });

      return { campaign, brief: updatedBrief };
    });

    log.info(
      {
        briefId: id,
        campaignId: result.campaign.id,
        brand: brief.brandName,
      },
      "Converted brief to campaign"
    );

    return NextResponse.json({
      success: true,
      campaign: {
        ...result.campaign,
        startDate: result.campaign.startDate.toISOString(),
        endDate: result.campaign.endDate.toISOString(),
        createdAt: result.campaign.createdAt.toISOString(),
        updatedAt: result.campaign.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to convert brief to campaign");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}