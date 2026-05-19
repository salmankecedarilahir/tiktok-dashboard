#!/usr/bin/env tsx
import { getTopVideos } from "../src/lib/ranking";
import { logger } from "../src/lib/logger";

async function main() {
  const top = await getTopVideos(10);

  console.log("\n🏆 Top 10 Videos by Relevance Score:\n");
  console.log("Rank | Score | Views      | Likes      | Caption");
  console.log("-".repeat(80));

  for (const v of top) {
    const caption = (v.caption ?? "").slice(0, 40).padEnd(40);
    console.log(
      `${String(v.rank).padStart(4)} | ${v.relevanceScore.toFixed(2).padStart(5)} | ` +
        `${String(v.metrics.views).padStart(10)} | ${String(v.metrics.likes).padStart(10)} | ${caption}`
    );
  }

  process.exit(0);
}

main().catch((err) => {
  logger.error({ error: String(err) }, "Failed to run ranking");
  process.exit(1);
});
