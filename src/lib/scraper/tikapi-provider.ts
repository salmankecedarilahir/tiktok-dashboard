import { z } from "zod";
import type { ScrapedVideo, ScraperProvider } from "./provider";
import { createLogger } from "../logger";

const log = createLogger({ module: "tikapi" });

// ⚠️ IMPORTANT: TikAPI response shape bisa berubah/beda dari ini.
// Saat first run, kalau Zod parse fail, log raw response dan adjust schema.
// Cek dokumentasi terbaru di https://tikapi.io/documentation
const TikApiVideoSchema = z.object({
  id: z.string(),
  desc: z.string().nullable().optional().default(""),
  createTime: z.number(), // unix timestamp seconds
  video: z
    .object({
      duration: z.number().optional(),
      cover: z.string().optional(),
    })
    .optional(),
  stats: z.object({
    playCount: z.number(),
    diggCount: z.number(), // likes
    commentCount: z.number(),
    shareCount: z.number(),
    collectCount: z.number().optional().default(0), // saves
  }),
  textExtra: z
    .array(
      z.object({
        hashtagName: z.string().optional(),
      })
    )
    .optional()
    .default([]),
});

const TikApiResponseSchema = z.object({
  itemList: z.array(TikApiVideoSchema).optional().default([]),
  // TikAPI nests differently sometimes — handle both
  status: z.string().optional(),
  message: z.string().optional(),
});

export class TikApiProvider implements ScraperProvider {
  readonly name = "tikapi" as const;

  constructor(private readonly apiKey: string) {
    if (!apiKey) throw new Error("TikApiProvider: apiKey required");
  }

  async fetchRecentVideos(
    username: string,
    limit: number
  ): Promise<ScrapedVideo[]> {
    const url = `https://api.tikapi.io/public/posts?username=${encodeURIComponent(
      username
    )}&count=${Math.min(limit, 30)}`;

    log.info({ username, limit }, "Fetching from TikAPI");

    const res = await fetch(url, {
      headers: {
        "X-API-KEY": this.apiKey,
        Accept: "application/json",
      },
      // 30s timeout — fetch in Node 18+ supports AbortSignal.timeout
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`TikAPI ${res.status}: ${body.slice(0, 200)}`);
    }

    const raw = await res.json();
    const parsed = TikApiResponseSchema.safeParse(raw);

    if (!parsed.success) {
      log.error(
        { errors: parsed.error.flatten(), sample: JSON.stringify(raw).slice(0, 500) },
        "TikAPI response failed schema validation"
      );
      throw new Error("TikAPI response shape changed — check logs and update schema");
    }

    return parsed.data.itemList.map((item) => ({
      tiktokId: item.id,
      caption: item.desc || null,
      postedAt: new Date(item.createTime * 1000),
      durationSeconds: item.video?.duration ?? null,
      thumbnailUrl: item.video?.cover ?? null,
      videoUrl: `https://tiktok.com/@${username}/video/${item.id}`,
      hashtags: item.textExtra
        .map((t) => t.hashtagName)
        .filter((h): h is string => Boolean(h))
        .map((h) => `#${h}`),
      metrics: {
        views: item.stats.playCount,
        likes: item.stats.diggCount,
        comments: item.stats.commentCount,
        shares: item.stats.shareCount,
        saves: item.stats.collectCount,
      },
    }));
  }
}
