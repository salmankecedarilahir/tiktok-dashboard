/**
 * Convert BigInt → Number safely.
 * Untuk TikTok metrics, Number cukup (max ~9 quadrillion).
 * Pakai ini sebelum kirim data ke client component.
 */
export const bigintToNumber = (val: bigint | number): number => {
  if (typeof val === "number") return val;
  const num = Number(val);
  if (!Number.isSafeInteger(num)) {
    console.warn(`BigInt ${val} loses precision when converted to Number`);
  }
  return num;
};

/**
 * Deep clone & convert all BigInt fields in object to Number.
 * Pakai untuk pass Prisma result ke Client Component.
 */
export const serializeBigInts = <T>(obj: T): T => {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === "bigint" ? Number(value) : value
    )
  ) as T;
};
