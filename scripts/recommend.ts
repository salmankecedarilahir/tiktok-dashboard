#!/usr/bin/env tsx
import { generateAndSaveRecommendations } from "../src/lib/recommendations";
import { logger } from "../src/lib/logger";

async function main() {
  try {
    await generateAndSaveRecommendations();
    logger.info("Done");
    process.exit(0);
  } catch (err) {
    logger.error({ error: String(err) }, "Failed");
    process.exit(1);
  }
}

main();
