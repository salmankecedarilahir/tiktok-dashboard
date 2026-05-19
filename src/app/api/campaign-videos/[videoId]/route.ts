import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "api/campaign-videos/[videoId]" });

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;

    await prisma.campaignVideo.delete({ where: { id: videoId } });

    log.info({ videoId }, "Deleted campaign video");

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to delete video");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}