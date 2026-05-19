import type { ScrapedVideo, ScraperProvider } from "./provider";
import { randomUUID } from "crypto";

const HASHTAG_POOLS = [
  ["#fyp", "#tongkrongan", "#pov"],
  ["#fyp", "#sundakeren"],
  ["#viral", "#pov", "#story"],
  ["#fyp", "#humor"],
];

const CAPTION_POOLS = [
  "POV: lo ketemu temen lama",
  "Storytime sehari di Jakarta",
  "Reaction nonton video lama",
  "Top 5 tempat ngopi murah",
  "Day in my life sebagai engineer",
];

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T>(arr: T[]): T => {
  const item = arr[Math.floor(Math.random() * arr.length)];
  if (item === undefined) throw new Error("pick: empty array");
  return item;
};

/**
 * Generates fake data — useful untuk:
 * 1. Dev tanpa TikAPI subscription
 * 2. Test recommendation engine dengan controlled data
 * 3. CI environment
 */
export class MockProvider implements ScraperProvider {
  readonly name = "mock" as const;

  async fetchRecentVideos(
    _username: string,
    limit: number
  ): Promise<ScrapedVideo[]> {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 500));

    const videos: ScrapedVideo[] = [];
    const now = Date.now();

    for (let i = 0; i < limit; i++) {
      const daysAgo = rand(1, 89);
      const postedAt = new Date(now - daysAgo * 86400000);
      postedAt.setHours(rand(0, 23), rand(0, 59), 0, 0);

      const views = rand(5000, 500000);

      videos.push({
        tiktokId: `mock_${randomUUID().slice(0, 12)}`,
        caption: pick(CAPTION_POOLS),
        postedAt,
        durationSeconds: pick([10, 15, 25, 30, 45, 60, 90]),
        thumbnailUrl: `https://picsum.photos/seed/${i}/400/600`,
        videoUrl: `https://tiktok.com/@mock/video/${i}`,
        hashtags: pick(HASHTAG_POOLS),
        metrics: {
          views,
          likes: Math.floor(views * (rand(2, 15) / 100)),
          comments: Math.floor(views * (rand(0, 5) / 100)),
          shares: Math.floor(views * (rand(0, 3) / 100)),
          saves: Math.floor(views * (rand(0, 4) / 100)),
        },
      });
    }

    return videos;
  }
}
