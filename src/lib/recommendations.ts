import { prisma } from "./prisma";
import { z } from "zod";
import { createLogger } from "./logger";

const log = createLogger({ module: "recommendations" });

const MIN_SAMPLE_SIZE = 5;

// ===== Schemas untuk validate query results =====

const postingTimeRowSchema = z.object({
  hour: z.coerce.number().int().min(0).max(23),
  dow: z.coerce.number().int().min(0).max(6),
  n_videos: z.coerce.number().int(),
  avg_engagement: z.coerce.number(),
});

const hashtagRowSchema = z.object({
  hashtag: z.string(),
  times_used: z.coerce.number().int(),
  avg_like_rate: z.coerce.number(),
});

const durationRowSchema = z.object({
  bucket: z.string(),
  n: z.coerce.number().int(),
  avg_like_rate: z.coerce.number(),
  avg_comment_rate: z.coerce.number(),
});

// ===== Types untuk recommendation payloads =====

export type PostingTimeRec = {
  hour: number;
  dayOfWeek: number;
  dayName: string;
  sampleSize: number;
  avgEngagementPct: number;
  message: string;
};

export type HashtagRec = {
  hashtag: string;
  timesUsed: number;
  avgLikeRatePct: number;
  message: string;
};

export type DurationRec = {
  bucket: string;
  sampleSize: number;
  avgLikeRatePct: number;
  avgCommentRatePct: number;
  message: string;
};

export type CaptionPatternRec = {
  pattern: string;
  occurrences: number;
  message: string;
};

const DOW_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// ===== Posting Time =====

export async function getBestPostingTimes(): Promise<PostingTimeRec[]> {
  const rows = await prisma.$queryRaw<unknown[]>`
    WITH ranked AS (
      SELECT
        v.id,
        EXTRACT(HOUR FROM v.posted_at AT TIME ZONE 'Asia/Jakarta')::int AS hour,
        EXTRACT(DOW FROM v.posted_at AT TIME ZONE 'Asia/Jakarta')::int AS dow,
        (l.likes::float + l.comments_count::float * 2) / NULLIF(l.views, 0) AS eng_rate
      FROM videos v
      JOIN LATERAL (
        SELECT * FROM video_snapshots
        WHERE video_id = v.id
        ORDER BY captured_at DESC
        LIMIT 1
      ) l ON true
      WHERE l.views > 1000
    )
    SELECT
      hour, dow,
      COUNT(*)::int AS n_videos,
      AVG(eng_rate) AS avg_engagement
    FROM ranked
    WHERE eng_rate >= COALESCE(
      (SELECT PERCENTILE_CONT(0.8) WITHIN GROUP (ORDER BY eng_rate) FROM ranked),
      0
    )
    GROUP BY hour, dow
    HAVING COUNT(*) >= 2
    ORDER BY avg_engagement DESC
    LIMIT 5;
  `;

  return rows.map((row) => {
    const parsed = postingTimeRowSchema.parse(row);
    const dayName = DOW_NAMES[parsed.dow] ?? "?";
    const engagementPct = parsed.avg_engagement * 100;

    return {
      hour: parsed.hour,
      dayOfWeek: parsed.dow,
      dayName,
      sampleSize: parsed.n_videos,
      avgEngagementPct: engagementPct,
      message: `${dayName} jam ${String(parsed.hour).padStart(2, "0")}:00 WIB — top performer slot (${engagementPct.toFixed(1)}% engagement)`,
    };
  });
}

// ===== Hashtags =====

export async function getBestHashtags(): Promise<HashtagRec[]> {
  const rows = await prisma.$queryRaw<unknown[]>`
    SELECT
      unnest(v.hashtags) AS hashtag,
      COUNT(*)::int AS times_used,
      AVG(s.likes::float / NULLIF(s.views, 0)) AS avg_like_rate
    FROM videos v
    JOIN LATERAL (
      SELECT * FROM video_snapshots
      WHERE video_id = v.id
      ORDER BY captured_at DESC
      LIMIT 1
    ) s ON true
    WHERE v.hashtags IS NOT NULL AND array_length(v.hashtags, 1) > 0
    GROUP BY hashtag
    HAVING COUNT(*) >= ${MIN_SAMPLE_SIZE}
    ORDER BY avg_like_rate DESC
    LIMIT 10;
  `;

  return rows.map((row) => {
    const parsed = hashtagRowSchema.parse(row);
    const likeRatePct = parsed.avg_like_rate * 100;
    return {
      hashtag: parsed.hashtag,
      timesUsed: parsed.times_used,
      avgLikeRatePct: likeRatePct,
      message: `${parsed.hashtag} — ${likeRatePct.toFixed(1)}% like rate (${parsed.times_used}x dipakai)`,
    };
  });
}

// ===== Duration =====

export async function getBestDurations(): Promise<DurationRec[]> {
  const rows = await prisma.$queryRaw<unknown[]>`
    SELECT
      CASE
        WHEN duration_seconds < 15 THEN '0-15s'
        WHEN duration_seconds < 30 THEN '15-30s'
        WHEN duration_seconds < 60 THEN '30-60s'
        ELSE '60s+'
      END AS bucket,
      COUNT(*)::int AS n,
      AVG(s.likes::float / NULLIF(s.views, 0)) AS avg_like_rate,
      AVG(s.comments_count::float / NULLIF(s.views, 0)) AS avg_comment_rate
    FROM videos v
    JOIN LATERAL (
      SELECT * FROM video_snapshots
      WHERE video_id = v.id
      ORDER BY captured_at DESC
      LIMIT 1
    ) s ON true
    WHERE duration_seconds IS NOT NULL
    GROUP BY bucket
    HAVING COUNT(*) >= 3
    ORDER BY avg_like_rate DESC;
  `;

  return rows.map((row) => {
    const parsed = durationRowSchema.parse(row);
    return {
      bucket: parsed.bucket,
      sampleSize: parsed.n,
      avgLikeRatePct: parsed.avg_like_rate * 100,
      avgCommentRatePct: parsed.avg_comment_rate * 100,
      message: `Durasi ${parsed.bucket} — ${(parsed.avg_like_rate * 100).toFixed(1)}% like rate (${parsed.n} video)`,
    };
  });
}

// ===== Caption Pattern (simple keyword detection) =====

export async function getCaptionPatterns(): Promise<CaptionPatternRec[]> {
  // Ambil top 10 video, ekstrak pattern dari caption
  const topVideos = await prisma.$queryRaw<Array<{ caption: string | null }>>`
    WITH latest AS (
      SELECT DISTINCT ON (video_id)
        video_id, views, likes, comments_count, shares
      FROM video_snapshots
      ORDER BY video_id, captured_at DESC
    )
    SELECT v.caption
    FROM videos v
    JOIN latest l ON l.video_id = v.id
    WHERE l.views > 1000 AND v.caption IS NOT NULL
    ORDER BY (
      (l.likes::float / NULLIF(l.views, 0)) * 40
      + (l.comments_count::float / NULLIF(l.views, 0)) * 35
    ) DESC
    LIMIT 10;
  `;

  // Simple pattern detection
  const patterns: Record<string, number> = {};
  const knownPatterns = [
    { regex: /pov\s*:/i, name: "POV:" },
    { regex: /storytime/i, name: "Storytime" },
    { regex: /reaction/i, name: "Reaction" },
    { regex: /day in (the|my|a) life/i, name: "Day in the life" },
    { regex: /top \d+/i, name: "Top [N] list" },
    { regex: /review/i, name: "Review" },
    { regex: /\?$/m, name: "Question hook" },
  ];

  for (const video of topVideos) {
    if (!video.caption) continue;
    for (const { regex, name } of knownPatterns) {
      if (regex.test(video.caption)) {
        patterns[name] = (patterns[name] ?? 0) + 1;
      }
    }
  }

  return Object.entries(patterns)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([pattern, count]) => ({
      pattern,
      occurrences: count,
      message: `Format "${pattern}" muncul di ${count} dari top 10 — coba lagi`,
    }));
}

// ===== Save to DB (untuk caching) =====

export async function generateAndSaveRecommendations(): Promise<void> {
  log.info("Generating recommendations...");

  const [postingTimes, hashtags, durations, captionPatterns] = await Promise.all([
    getBestPostingTimes(),
    getBestHashtags(),
    getBestDurations(),
    getCaptionPatterns(),
  ]);

  // Save snapshot ke DB
  await prisma.$transaction([
    prisma.recommendation.create({
      data: { kind: "posting_time", payload: postingTimes },
    }),
    prisma.recommendation.create({
      data: { kind: "hashtag_combo", payload: hashtags },
    }),
    prisma.recommendation.create({
      data: { kind: "duration_bucket", payload: durations },
    }),
    prisma.recommendation.create({
      data: { kind: "caption_pattern", payload: captionPatterns },
    }),
  ]);

  log.info(
    {
      postingTimes: postingTimes.length,
      hashtags: hashtags.length,
      durations: durations.length,
      captionPatterns: captionPatterns.length,
    },
    "Recommendations saved"
  );
}

// ===== Helper untuk dashboard (compute on-demand) =====

export async function getAllRecommendations() {
  const [postingTimes, hashtags, durations, captionPatterns] = await Promise.all([
    getBestPostingTimes(),
    getBestHashtags(),
    getBestDurations(),
    getCaptionPatterns(),
  ]);

  return { postingTimes, hashtags, durations, captionPatterns };
}
