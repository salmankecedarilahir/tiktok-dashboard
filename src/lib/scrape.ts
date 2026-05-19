import { prisma } from "./prisma";
import { createProvider } from "./scraper/factory";
import { retry } from "./retry";
import { createLogger } from "./logger";
import { env } from "./env";

const log = createLogger({ module: "scrape" });

export interface ScrapeResult {
  jobId: string;
  videosFound: number;
  videosNew: number;
  snapshotsAdded: number;
  durationMs: number;
}

/**
 * Main scrape job:
 * 1. Create scrape_job row (status=running)
 * 2. Fetch videos via provider (with retry)
 * 3. Upsert videos (idempotent — tiktokId unique)
 * 4. Insert snapshots (idempotent — composite PK)
 * 5. Update scrape_job (status=success/failed)
 */
export async function runScrape(opts: { limit?: number } = {}): Promise<ScrapeResult> {
  const limit = opts.limit ?? 50;
  const provider = createProvider();
  const startedAt = Date.now();

  // 1. Create job log
  const job = await prisma.scrapeJob.create({
    data: {
      status: "running",
      provider: provider.name,
    },
  });

  log.info({ jobId: job.id, provider: provider.name, limit }, "Scrape started");

  try {
    // 2. Fetch with retry
    const scraped = await retry(
      () => provider.fetchRecentVideos(env.TIKTOK_USERNAME, limit),
      { maxAttempts: 3, initialDelayMs: 2000 }
    );

    log.info({ count: scraped.length }, "Videos fetched");

    let videosNew = 0;
    let snapshotsAdded = 0;
    const capturedAt = new Date();
    // Round ke detik buat dedupe — kalau scrape jalan 2x dalam 1 detik, snapshot kedua skip
    capturedAt.setMilliseconds(0);

    // 3 + 4. Upsert videos + insert snapshots dalam satu transaction
    for (const v of scraped) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          const existing = await tx.video.findUnique({
            where: { tiktokId: v.tiktokId },
            select: { id: true },
          });

          const video = await tx.video.upsert({
            where: { tiktokId: v.tiktokId },
            create: {
              tiktokId: v.tiktokId,
              caption: v.caption,
              postedAt: v.postedAt,
              durationSeconds: v.durationSeconds,
              thumbnailUrl: v.thumbnailUrl,
              videoUrl: v.videoUrl,
              hashtags: v.hashtags,
            },
            update: {
              // Caption + hashtags bisa berubah kalau creator edit
              caption: v.caption,
              hashtags: v.hashtags,
              thumbnailUrl: v.thumbnailUrl,
            },
          });

          // Idempotent insert — kalau composite PK (videoId, capturedAt) sudah ada, skip
          const snapshot = await tx.videoSnapshot.upsert({
            where: {
              videoId_capturedAt: {
                videoId: video.id,
                capturedAt,
              },
            },
            create: {
              videoId: video.id,
              capturedAt,
              views: BigInt(v.metrics.views),
              likes: BigInt(v.metrics.likes),
              commentsCount: BigInt(v.metrics.comments),
              shares: BigInt(v.metrics.shares),
              saves: BigInt(v.metrics.saves),
            },
            update: {}, // No-op kalau sudah ada
          });

          return {
            isNew: !existing,
            snapshotCreated: snapshot.capturedAt.getTime() === capturedAt.getTime(),
          };
        });

        if (result.isNew) videosNew++;
        snapshotsAdded++;
      } catch (err) {
        log.error(
          { tiktokId: v.tiktokId, error: String(err) },
          "Failed to upsert video"
        );
        // Continue dengan video lain — single failure jangan kill whole job
      }
    }

    const durationMs = Date.now() - startedAt;

    // 5. Mark success
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        videosFound: scraped.length,
        videosNew,
        snapshotsAdded,
        durationMs,
      },
    });

    log.info(
      { jobId: job.id, videosFound: scraped.length, videosNew, snapshotsAdded, durationMs },
      "Scrape finished"
    );

    return {
      jobId: job.id,
      videosFound: scraped.length,
      videosNew,
      snapshotsAdded,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const errorMessage = err instanceof Error ? err.message : String(err);

    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorMessage,
        durationMs,
      },
    });

    log.error({ jobId: job.id, error: errorMessage, durationMs }, "Scrape failed");
    throw err;
  }
}
