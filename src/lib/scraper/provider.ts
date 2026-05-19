/**
 * Normalized shape — every provider must return data in this format.
 * Decouples scraping logic dari data source.
 */
export interface ScrapedVideo {
  tiktokId: string;
  caption: string | null;
  postedAt: Date;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  hashtags: string[];
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
}

export interface ScraperProvider {
  readonly name: "mock" | "tikapi" | "csv";

  /**
   * Fetch up to `limit` recent videos for the given username.
   * Should throw on auth/network errors — orchestrator handles retry.
   */
  fetchRecentVideos(username: string, limit: number): Promise<ScrapedVideo[]>;
}
