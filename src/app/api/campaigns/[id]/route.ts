import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getSessionOrThrow, requireRole, handleAuthError } from "@/lib/auth-helpers";

const log = createLogger({ module: "api/campaigns/[id]" });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionOrThrow();
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        brief: {
          select: { id: true, brandName: true, status: true, inquiryDate: true },
        },
        videos: {
          orderBy: { postedAt: "desc" },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({
      campaign: {
        ...campaign,
        startDate: campaign.startDate.toISOString(),
        endDate: campaign.endDate.toISOString(),
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
        videos: campaign.videos.map((v) => ({
          ...v,
          views: Number(v.views),
          likes: Number(v.likes),
          comments: Number(v.comments),
          shares: Number(v.shares),
          saves: Number(v.saves),
          postedAt: v.postedAt.toISOString(),
          createdAt: v.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to get campaign");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.ADMIN, Role.EDITOR]);
    const { id } = await params;

    await prisma.campaign.delete({ where: { id } });

    log.info({ id }, "Deleted campaign");

    return NextResponse.json({ success: true });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to delete campaign");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}