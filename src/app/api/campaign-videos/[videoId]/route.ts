import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getSessionOrThrow, requireRole, handleAuthError } from "@/lib/auth-helpers";

const log = createLogger({ module: "api/campaign-videos/[videoId]" });

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.ADMIN, Role.EDITOR]);
    const { videoId } = await params;

    await prisma.campaignVideo.delete({ where: { id: videoId } });

    log.info({ videoId }, "Deleted campaign video");

    return NextResponse.json({ success: true });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to delete video");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
