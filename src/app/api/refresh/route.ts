import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { runScrape } from "@/lib/scrape";
import { generateAndSaveRecommendations } from "@/lib/recommendations";
import { createLogger } from "@/lib/logger";
import { getSessionOrThrow, requireRole, handleAuthError } from "@/lib/auth-helpers";

const log = createLogger({ module: "api/refresh" });

// In-memory rate limit: cuma boleh refresh tiap 60 detik
// Cocok untuk single-user MVP. Untuk multi-user pakai Redis.
let lastRefreshAt = 0;
const RATE_LIMIT_MS = 60_000;

export async function POST() {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.ADMIN, Role.EDITOR]);

    const now = Date.now();
    const secondsSince = (now - lastRefreshAt) / 1000;

    if (secondsSince < RATE_LIMIT_MS / 1000) {
      const waitSec = Math.ceil(RATE_LIMIT_MS / 1000 - secondsSince);
      return NextResponse.json(
        { error: `Rate limited. Wait ${waitSec}s before next refresh.` },
        { status: 429 }
      );
    }

    lastRefreshAt = now;

    log.info({ user: session.user.email }, "Manual refresh triggered");

    const result = await runScrape({ limit: 50 });
    await generateAndSaveRecommendations();

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    log.error({ error: String(err) }, "Refresh failed");
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Refresh failed",
      },
      { status: 500 }
    );
  }
}
