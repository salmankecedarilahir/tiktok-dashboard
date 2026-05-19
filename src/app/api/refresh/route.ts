import { NextResponse } from "next/server";
import { runScrape } from "@/lib/scrape";
import { generateAndSaveRecommendations } from "@/lib/recommendations";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "api/refresh" });

// In-memory rate limit: cuma boleh refresh tiap 60 detik
// Cocok untuk single-user MVP. Untuk multi-user pakai Redis.
let lastRefreshAt = 0;
const RATE_LIMIT_MS = 60_000;

export async function POST() {
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

  try {
    log.info("Manual refresh triggered");

    const result = await runScrape({ limit: 50 });
    await generateAndSaveRecommendations();

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    log.error({ error: String(err) }, "Refresh failed");
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Refresh failed",
      },
      { status: 500 }
    );
  }
}
