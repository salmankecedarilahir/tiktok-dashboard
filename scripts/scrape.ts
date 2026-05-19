#!/usr/bin/env tsx
import { runScrape } from "../src/lib/scrape";
import { logger } from "../src/lib/logger";

async function main() {
  try {
    const result = await runScrape({ limit: 50 });
    logger.info(result, "✅ Scrape completed");
    process.exit(0);
  } catch (err) {
    logger.error({ error: String(err) }, "❌ Scrape failed");
    process.exit(1);
  }
}

main();
