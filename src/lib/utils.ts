import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format angka jadi K/M (mis. 12.5K, 1.2M).
 */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

/**
 * Extract TikTok video ID dari URL standar.
 * Support: https://www.tiktok.com/@username/video/1234567890[?...]
 * Return null untuk short URL (vm.tiktok.com/...) atau format lain.
 */
export function extractTikTokVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // tolak short URL
  if (/vm\.tiktok\.com/i.test(trimmed)) return null;
  const m = trimmed.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  if (m && m[1]) return m[1];
  // fallback: cari pola "/video/<digits>" di URL lain di domain tiktok
  if (/tiktok\.com/i.test(trimmed)) {
    const m2 = trimmed.match(/\/video\/(\d+)/);
    if (m2 && m2[1]) return m2[1];
  }
  return null;
}

/**
 * Engagement rate = ((likes + comments + shares) / views) * 100.
 * Return 0 kalau views = 0 (hindari division-by-zero).
 */
export function calculateEngagement(
  views: number,
  likes: number,
  comments: number,
  shares: number
): number {
  if (!views || views <= 0) return 0;
  return ((likes + comments + shares) / views) * 100;
}

/**
 * Range tanggal untuk week dalam bulan:
 * Week 1: 1-7, Week 2: 8-14, Week 3: 15-21, Week 4: 22-akhir bulan.
 */
export function getWeekDateRange(
  weekNumber: number,
  month: number,
  year: number
): { start: number; end: number } {
  const lastDay = new Date(year, month, 0).getDate();
  switch (weekNumber) {
    case 1:
      return { start: 1, end: 7 };
    case 2:
      return { start: 8, end: 14 };
    case 3:
      return { start: 15, end: 21 };
    case 4:
      return { start: 22, end: lastDay };
    default:
      return { start: 1, end: lastDay };
  }
}
