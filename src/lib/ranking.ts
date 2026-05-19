import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

// Bobot relevance score — extract ke const biar gampang di-tune
export const RANKING_WEIGHTS = {
  likes: 40,
  comments: 35,
  shares: 15,
  recency: 10,
} as const;

// Minimum views — filter out video yang nggak pernah viral sama sekali
export const MIN_VIEWS_THRESHOLD = 1000;

// Recency decay window — setelah N hari, recency score = 0
export const RECENCY_DECAY_DAYS = 90;

// Raw query result schema — Postgres return NUMERIC sebagai string
const rawRowSchema = z.object({
  id: z.string().uuid(),
  tiktok_id: z.string(),
  caption: z.string().nullable(),
  posted_at: z.date(),
  thumbnail_url: z.string().nullable(),
  video_url: z.string().nullable(),
  duration_seconds: z.number().int().nullable(),
  hashtags: z.array(z.string()),
  views: z.bigint(),
  likes: z.bigint(),
  comments_count: z.bigint(),
  shares: z.bigint(),
  relevance_score: z.coerce.number(),
});

export type TopVideo = {
  id: string;
  tiktokId: string;
  caption: string | null;
  postedAt: Date;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  durationSeconds: number | null;
  hashtags: string[];
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  relevanceScore: number;
  rank: number;
};

/**
 * Get top N videos by relevance score.
 * Uses DISTINCT ON to pick latest snapshot per video, then computes score.
 *
 * Performance: pakai index on (video_id, captured_at DESC) — sudah ada via Prisma.
 * Untuk 50 video × 1 snapshot/hari, query ini <50ms.
 */
export async function getTopVideos(limit = 10): Promise<TopVideo[]> {
  const rows = await prisma.$queryRaw<unknown[]>`
    WITH latest AS (
      SELECT DISTINCT ON (video_id)
        video_id, views, likes, comments_count, shares
      FROM video_snapshots
      ORDER BY video_id, captured_at DESC
    )
    SELECT
      v.id,
      v.tiktok_id,
      v.caption,
      v.posted_at,
      v.thumbnail_url,
      v.video_url,
      v.duration_seconds,
      v.hashtags,
      l.views,
      l.likes,
      l.comments_count,
      l.shares,
      ROUND((
        (l.likes::float / NULLIF(l.views, 0)) * ${RANKING_WEIGHTS.likes}
        + (l.comments_count::float / NULLIF(l.views, 0)) * ${RANKING_WEIGHTS.comments}
        + (l.shares::float / NULLIF(l.views, 0)) * ${RANKING_WEIGHTS.shares}
        + GREATEST(0, 1 - (EXTRACT(EPOCH FROM (NOW() - v.posted_at))
          / (${RECENCY_DECAY_DAYS} * 86400))) * ${RANKING_WEIGHTS.recency}
      )::numeric, 2) AS relevance_score
    FROM videos v
    JOIN latest l ON l.video_id = v.id
    WHERE l.views >= ${MIN_VIEWS_THRESHOLD}
    ORDER BY relevance_score DESC
    LIMIT ${limit};
  `;

  return rows.map((row, idx) => {
    const parsed = rawRowSchema.parse(row);
    return {
      id: parsed.id,
      tiktokId: parsed.tiktok_id,
      caption: parsed.caption,
      postedAt: parsed.posted_at,
      thumbnailUrl: parsed.thumbnail_url,
      videoUrl: parsed.video_url,
      durationSeconds: parsed.duration_seconds,
      hashtags: parsed.hashtags,
      metrics: {
        views: Number(parsed.views),
        likes: Number(parsed.likes),
        comments: Number(parsed.comments_count),
        shares: Number(parsed.shares),
      },
      relevanceScore: parsed.relevance_score,
      rank: idx + 1,
    };
  });
}

/**
 * Alternative: prepared statement version pakai Prisma.sql buat composability.
 * Berguna kalau lo mau extend dengan filter (e.g., by hashtag).
 */
export async function getTopVideosFiltered(opts: {
  limit?: number;
  minViews?: number;
  sinceDays?: number;
}): Promise<TopVideo[]> {
  const limit = opts.limit ?? 10;
  const minViews = opts.minViews ?? MIN_VIEWS_THRESHOLD;
  const sinceDays = opts.sinceDays ?? RECENCY_DECAY_DAYS;

  // Build conditions
  const conditions: Prisma.Sql[] = [
    Prisma.sql`l.views >= ${minViews}`,
  ];
  if (opts.sinceDays) {
    conditions.push(
      Prisma.sql`v.posted_at >= NOW() - INTERVAL '${Prisma.raw(String(sinceDays))} days'`
    );
  }

  const whereClause = Prisma.join(conditions, " AND ");

  const rows = await prisma.$queryRaw<unknown[]>`
    WITH latest AS (
      SELECT DISTINCT ON (video_id)
        video_id, views, likes, comments_count, shares
      FROM video_snapshots
      ORDER BY video_id, captured_at DESC
    )
    SELECT
      v.id, v.tiktok_id, v.caption, v.posted_at, v.thumbnail_url, v.video_url,
      v.duration_seconds, v.hashtags,
      l.views, l.likes, l.comments_count, l.shares,
      ROUND((
        (l.likes::float / NULLIF(l.views, 0)) * ${RANKING_WEIGHTS.likes}
        + (l.comments_count::float / NULLIF(l.views, 0)) * ${RANKING_WEIGHTS.comments}
        + (l.shares::float / NULLIF(l.views, 0)) * ${RANKING_WEIGHTS.shares}
        + GREATEST(0, 1 - (EXTRACT(EPOCH FROM (NOW() - v.posted_at))
          / (${sinceDays} * 86400))) * ${RANKING_WEIGHTS.recency}
      )::numeric, 2) AS relevance_score
    FROM videos v
    JOIN latest l ON l.video_id = v.id
    WHERE ${whereClause}
    ORDER BY relevance_score DESC
    LIMIT ${limit};
  `;

  return rows.map((row, idx) => {
    const parsed = rawRowSchema.parse(row);
    return {
      id: parsed.id,
      tiktokId: parsed.tiktok_id,
      caption: parsed.caption,
      postedAt: parsed.posted_at,
      thumbnailUrl: parsed.thumbnail_url,
      videoUrl: parsed.video_url,
      durationSeconds: parsed.duration_seconds,
      hashtags: parsed.hashtags,
      metrics: {
        views: Number(parsed.views),
        likes: Number(parsed.likes),
        comments: Number(parsed.comments_count),
        shares: Number(parsed.shares),
      },
      relevanceScore: parsed.relevance_score,
      rank: idx + 1,
    };
  });
}
