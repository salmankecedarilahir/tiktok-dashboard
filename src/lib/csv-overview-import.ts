import { z } from "zod";
import { prisma } from "./prisma";
import { createLogger } from "./logger";

const log = createLogger({ module: "csv-overview-import" });

/**
 * TikTok Studio Overview.csv format:
 * "Date","Video Views","Profile Views","Likes","Comments","Shares"
 * "May 13","22944","273","1617","84","249"
 *
 * Date format: "Month Day" (e.g., "May 13", "April 19") — tahun di-infer.
 */

const rowSchema = z.object({
  dateStr: z.string().min(1),
  videoViews: z.coerce.number().int().nonnegative(),
  profileViews: z.coerce.number().int().nonnegative(),
  likes: z.coerce.number().int().nonnegative(),
  comments: z.coerce.number().int().nonnegative(),
  shares: z.coerce.number().int().nonnegative(),
});

export type ParsedDailyRow = z.infer<typeof rowSchema> & { date: Date };

/**
 * Parse CSV string ke array of daily metrics.
 * Year inference: data ordered dari lama → baru, walk backward dari endDate.
 */
export function parseOverviewCsv(
  csvContent: string,
  endDate: Date = new Date()
): ParsedDailyRow[] {
  // Strip BOM kalau ada
  const cleaned = csvContent.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) {
    throw new Error("CSV kosong atau cuma header");
  }

  // Skip header
  const dataLines = lines.slice(1);

  const months: Record<string, number> = {
    January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
  };

  // Parse semua row dulu (tanpa tahun)
  const rawRows: { monthDay: string; data: Omit<ParsedDailyRow, "date"> }[] = [];

  for (const line of dataLines) {
    const cells = parseCsvLine(line);
    if (cells.length < 6) continue;

    try {
      const parsed = rowSchema.parse({
        dateStr: cells[0],
        videoViews: cells[1],
        profileViews: cells[2],
        likes: cells[3],
        comments: cells[4],
        shares: cells[5],
      });

      // Validate date format
      const [monthName, dayStr] = parsed.dateStr.split(" ");
      if (!monthName || !dayStr) continue;
      const monthIdx = months[monthName];
      const day = parseInt(dayStr, 10);
      if (monthIdx === undefined || isNaN(day)) continue;

      rawRows.push({
        monthDay: parsed.dateStr,
        data: parsed,
      });
    } catch (e) {
      log.warn({ line, error: String(e) }, "Skip invalid row");
    }
  }

  if (rawRows.length === 0) {
    throw new Error("Nggak ada data valid di CSV");
  }

  // Year inference: walk backward dari last row (paling recent)
  const endYear = endDate.getFullYear();
  const result: ParsedDailyRow[] = [];

  let currentYear = endYear;
  let prevMonthIdx: number | null = null;

  for (let i = rawRows.length - 1; i >= 0; i--) {
    const row = rawRows[i]!;
    const [monthName, dayStr] = row.monthDay.split(" ");
    const monthIdx = months[monthName!]!;
    const day = parseInt(dayStr!, 10);

    // Kalau current month > prev month (di iterasi backward) = tahun mundur
    if (prevMonthIdx !== null && monthIdx > prevMonthIdx) {
      currentYear -= 1;
    }

    const date = new Date(Date.UTC(currentYear, monthIdx, day));
    result.unshift({ ...row.data, date });
    prevMonthIdx = monthIdx;
  }

  return result;
}

/** Naive CSV parser yang handle quoted fields */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Import parsed rows ke database. Idempotent: upsert by date.
 */
export async function importDailyMetrics(
  rows: ParsedDailyRow[]
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const existing = await prisma.dailyMetric.findUnique({
      where: { date: row.date },
    });

    await prisma.dailyMetric.upsert({
      where: { date: row.date },
      create: {
        date: row.date,
        videoViews: BigInt(row.videoViews),
        profileViews: BigInt(row.profileViews),
        likes: BigInt(row.likes),
        comments: BigInt(row.comments),
        shares: BigInt(row.shares),
      },
      update: {
        videoViews: BigInt(row.videoViews),
        profileViews: BigInt(row.profileViews),
        likes: BigInt(row.likes),
        comments: BigInt(row.comments),
        shares: BigInt(row.shares),
      },
    });

    if (existing) updated++;
    else inserted++;
  }

  log.info({ inserted, updated }, "Imported daily metrics");
  return { inserted, updated };
}

/**
 * Helper: aggregate daily metrics untuk report.
 */
export async function getChannelOverview(opts: { days?: number } = {}) {
  const days = opts.days ?? 365;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const metrics = await prisma.dailyMetric.findMany({
    where: { date: { gte: cutoff } },
    orderBy: { date: "asc" },
  });

  if (metrics.length === 0) {
    return null;
  }

  const totalViews = metrics.reduce((sum, m) => sum + Number(m.videoViews), 0);
  const totalLikes = metrics.reduce((sum, m) => sum + Number(m.likes), 0);
  const totalComments = metrics.reduce((sum, m) => sum + Number(m.comments), 0);
  const totalShares = metrics.reduce((sum, m) => sum + Number(m.shares), 0);
  const totalProfileViews = metrics.reduce((sum, m) => sum + Number(m.profileViews), 0);

  // Last 30 days
  const last30Cutoff = new Date();
  last30Cutoff.setDate(last30Cutoff.getDate() - 30);
  const last30 = metrics.filter((m) => m.date >= last30Cutoff);
  const last30Views = last30.reduce((sum, m) => sum + Number(m.videoViews), 0);

  // Top viral day
  const topDay = metrics.reduce(
    (max, m) => (Number(m.videoViews) > Number(max.videoViews) ? m : max),
    metrics[0]!
  );

  return {
    daysTracked: metrics.length,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    totalProfileViews,
    likeRate: totalViews ? (totalLikes / totalViews) * 100 : 0,
    commentRate: totalViews ? (totalComments / totalViews) * 100 : 0,
    shareRate: totalViews ? (totalShares / totalViews) * 100 : 0,
    profileCtr: totalViews ? (totalProfileViews / totalViews) * 100 : 0,
    last30Views,
    avgViewsPerDay: Math.round(totalViews / metrics.length),
    topViralDay: {
      date: topDay.date,
      views: Number(topDay.videoViews),
      likes: Number(topDay.likes),
    },
    timeseries: metrics.map((m) => ({
      date: m.date,
      views: Number(m.videoViews),
      likes: Number(m.likes),
      comments: Number(m.comments),
      shares: Number(m.shares),
    })),
  };
}