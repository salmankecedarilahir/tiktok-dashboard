import { env } from "../env";
import { MockProvider } from "./mock-provider";
import { TikApiProvider } from "./tikapi-provider";
import { CsvProvider } from "./csv-provider";
import type { ScraperProvider } from "./provider";

export function createProvider(): ScraperProvider {
  switch (env.SCRAPER_PROVIDER) {
    case "mock":
      return new MockProvider();
    case "tikapi":
      return new TikApiProvider(env.TIKAPI_KEY);
    case "csv":
      return new CsvProvider();
    default: {
      // Exhaustive check — compile-time error kalau ada enum baru
      const _exhaustive: never = env.SCRAPER_PROVIDER;
      throw new Error(`Unknown provider: ${_exhaustive}`);
    }
  }
}

export type { ScraperProvider, ScrapedVideo } from "./provider";
