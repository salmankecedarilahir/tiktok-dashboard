import { NextRequest, NextResponse } from "next/server";
import { runScrape } from "@/lib/scrape";
import { generateAndSaveRecommendations } from "@/lib/recommendations";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "api/cron" });

// Increase Vercel function timeout for cron (max 60s on Hobby, 300s on Pro)
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify Vercel Cron secret atau manual secret
  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${env.CRON_SECRET}`;

  if (authHeader !== expectedToken) {
    log.warn({ ip: req.headers.get("x-forwarded-for") }, "Unauthorized cron call");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    log.info("Cron job started");

    const scrapeResult = await runScrape({ limit: 50 });
    await generateAndSaveRecommendations();

    log.info(scrapeResult, "Cron job completed");

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      ...scrapeResult,
    });
  } catch (err) {
    log.error({ error: String(err) }, "Cron job failed");
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Cron failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
