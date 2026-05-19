import { readFile } from "fs/promises";
import { z } from "zod";
import type { ScrapedVideo, ScraperProvider } from "./provider";
import { createLogger } from "../logger";

const log = createLogger({ module: "csv-provider" });

/**
 * Fallback: import dari TikTok Studio CSV export.
 *
 * Cara pakai:
 * 1. Login TikTok Studio → Analytics → Export
 * 2. Save CSV ke `data/tiktok-export.csv`
 * 3. Set SCRAPER_PROVIDER=csv di .env
 *
 * Catatan: TikTok Studio CSV format bisa berubah. Adjust column mapping
 * di parseRow() sesuai header export terbaru.
 */
export class CsvProvider implements ScraperProvider {
  readonly name = "csv" as const;

  constructor(private readonly filePath: string = "data/tiktok-export.csv") {}

  async fetchRecentVideos(
    _username: string,
    limit: number
  ): Promise<ScrapedVideo[]> {
    const content = await readFile(this.filePath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());

    if (lines.length < 2) {
      throw new Error(`CSV file empty or missing data rows: ${this.filePath}`);
    }

    const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
    const videos: ScrapedVideo[] = [];

    for (let i = 1; i < lines.length && videos.length < limit; i++) {
      const row = parseCsvRow(lines[i]!);
      try {
        const video = mapRowToVideo(header, row);
        videos.push(video);
      } catch (e) {
        log.warn({ row: i, error: String(e) }, "Skipping invalid row");
      }
    }

    log.info({ count: videos.length }, "Loaded videos from CSV");
    return videos;
  }
}

/** Naive CSV parser — handles basic quoted fields */
function parseCsvRow(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
}

const csvRowSchema = z.object({
  videoId: z.string().min(1),
  caption: z.string().optional().default(""),
  postedAt: z.string().min(1),
  duration: z.coerce.number().int().nonnegative().nullable().optional(),
  views: z.coerce.number().int().nonnegative(),
  likes: z.coerce.number().int().nonnegative(),
  comments: z.coerce.number().int().nonnegative(),
  shares: z.coerce.number().int().nonnegative().default(0),
});

function mapRowToVideo(header: string[], row: string[]): ScrapedVideo {
  // Adjust these keys to match your CSV export. Common TikTok Studio exports use:
  // "Video ID", "Video Title", "Post Time", "Duration", "Views", "Likes", "Comments", "Shares"
  const get = (key: string): string => {
    const idx = header.indexOf(key.toLowerCase());
    return idx >= 0 ? row[idx] ?? "" : "";
  };

  const parsed = csvRowSchema.parse({
    videoId: get("video id") || get("id"),
    caption: get("video title") || get("caption"),
    postedAt: get("post time") || get("posted at"),
    duration: get("duration") || null,
    views: get("views") || "0",
    likes: get("likes") || "0",
    comments: get("comments") || "0",
    shares: get("shares") || "0",
  });

  // Extract hashtags dari caption
  const hashtags = parsed.caption.match(/#\w+/g) ?? [];

  return {
    tiktokId: parsed.videoId,
    caption: parsed.caption || null,
    postedAt: new Date(parsed.postedAt),
    durationSeconds: parsed.duration ?? null,
    thumbnailUrl: null,
    videoUrl: null,
    hashtags,
    metrics: {
      views: parsed.views,
      likes: parsed.likes,
      comments: parsed.comments,
      shares: parsed.shares,
      saves: 0,
    },
  };
}
