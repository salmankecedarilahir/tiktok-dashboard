import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

// Helper: random int dalam range
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Helper: random pick dari array
const pick = <T>(arr: T[]): T => {
  const item = arr[Math.floor(Math.random() * arr.length)];
  if (item === undefined) throw new Error("pick: array kosong");
  return item;
};

const SAMPLE_HASHTAGS = [
  ["#fyp", "#tongkrongan", "#pov"],
  ["#fyp", "#sundakeren", "#bandung"],
  ["#viral", "#pov", "#story"],
  ["#fyp", "#humor", "#meme"],
  ["#fyp", "#vlog", "#dailylife"],
  ["#fyp", "#tutorial", "#tips"],
  ["#fyp", "#review", "#kuliner"],
  ["#fyp", "#asmr"],
];

const SAMPLE_CAPTIONS = [
  "POV: lo ketemu temen lama di cafe",
  "Trik bikin kopi enak di rumah part 2",
  "Ini kenapa gen Z susah nabung 😭",
  "Reaction nonton video lama gue",
  "Storytime: kerja di startup tahun pertama",
  "Top 5 makanan murah di Bandung",
  "Day in my life sebagai software engineer",
  "Review honest gadget murah viral",
  "POV: lo telat meeting Senin pagi",
  "Hidup hemat anak kos part 7",
];

async function main() {
  console.log("🌱 Seeding...");

  // Clear existing
  await prisma.videoSnapshot.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.scrapeJob.deleteMany();
  await prisma.video.deleteMany();

  const now = new Date();

  // Generate 25 dummy videos posted dalam 90 hari terakhir
  for (let i = 0; i < 25; i++) {
    const daysAgo = rand(1, 89);
    const postedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Random posting hour, bias ke evening (engagement biasanya tinggi)
    postedAt.setHours(rand(0, 23), rand(0, 59), 0, 0);

    const duration = pick([8, 12, 15, 18, 25, 30, 45, 60, 75, 90]);
    const baseViews = rand(5000, 500000);

    const video = await prisma.video.create({
      data: {
        tiktokId: `dummy_${i}_${randomUUID().slice(0, 8)}`,
        caption: pick(SAMPLE_CAPTIONS),
        postedAt,
        durationSeconds: duration,
        thumbnailUrl: `https://picsum.photos/seed/${i}/400/600`,
        videoUrl: `https://tiktok.com/@abangabanganthis/video/dummy_${i}`,
        hashtags: pick(SAMPLE_HASHTAGS),
      },
    });

    // Generate 3 snapshots per video (kemarin, hari ini, atau seminggu lalu — variasi)
    const snapshotDays = [Math.min(daysAgo, 7), Math.min(daysAgo, 3), 0];

    for (const dayOffset of snapshotDays) {
      const capturedAt = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);

      // Metrics tumbuh seiring waktu: snapshot lebih lama = views lebih kecil
      const growthFactor = 1 - dayOffset / 30;
      const views = Math.floor(baseViews * growthFactor);
      const likes = Math.floor(views * (rand(2, 15) / 100));
      const comments = Math.floor(views * (rand(0, 5) / 100));
      const shares = Math.floor(views * (rand(0, 3) / 100));
      const saves = Math.floor(views * (rand(0, 4) / 100));

      await prisma.videoSnapshot.create({
        data: {
          videoId: video.id,
          capturedAt,
          views: BigInt(views),
          likes: BigInt(likes),
          commentsCount: BigInt(comments),
          shares: BigInt(shares),
          saves: BigInt(saves),
        },
      });
    }
  }

  // Dummy scrape job log
  await prisma.scrapeJob.create({
    data: {
      status: "success",
      provider: "mock",
      videosFound: 25,
      videosNew: 25,
      snapshotsAdded: 75,
      finishedAt: new Date(),
      durationMs: 1234,
    },
  });

  const videoCount = await prisma.video.count();
  const snapshotCount = await prisma.videoSnapshot.count();
  console.log(`✅ Seeded ${videoCount} videos, ${snapshotCount} snapshots`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
