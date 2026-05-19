import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.LOG_LEVEL,
  // Pretty print di dev, JSON di production (lebih gampang di-parse Vercel logs)
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  base: {
    app: "tiktok-analytics",
    env: env.NODE_ENV,
  },
});

/** Child logger dengan context */
export const createLogger = (context: Record<string, unknown>) =>
  logger.child(context);
