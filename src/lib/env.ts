import { z } from "zod";

// Auto-load .env kalau dijalankan di luar Next.js (e.g., tsx scripts/*.ts)
// Next.js sudah handle ini otomatis di dev/build/runtime.
if (!process.env.NEXT_RUNTIME && process.env.NODE_ENV !== "test") {
  try {
    // Dynamic require biar nggak crash kalau dotenv belum ke-install
    // (Next.js bundling akan skip block ini di production build)
    require("dotenv").config();
  } catch {
    // dotenv not available — Next.js runtime handles it
  }
}

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Target
  TIKTOK_USERNAME: z.string().min(1),

  // Scraper
  SCRAPER_PROVIDER: z.enum(["mock", "tikapi", "csv"]).default("mock"),
  TIKAPI_KEY: z.string().optional().default(""),

  // Secrets
  CRON_SECRET: z.string().min(32, "CRON_SECRET must be at least 32 chars"),
  REFRESH_SECRET: z.string().min(32, "REFRESH_SECRET must be at least 32 chars"),

  // Sentry (optional)
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional().default(""),
  SENTRY_AUTH_TOKEN: z.string().optional().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;

if (env.SCRAPER_PROVIDER === "tikapi" && !env.TIKAPI_KEY) {
  throw new Error("SCRAPER_PROVIDER=tikapi but TIKAPI_KEY is empty");
}
