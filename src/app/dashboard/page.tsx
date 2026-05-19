import { Suspense } from "react";
import { getTopVideos } from "@/lib/ranking";
import { getAllRecommendations } from "@/lib/recommendations";
import { prisma } from "@/lib/prisma";
import { TopVideosTable } from "@/components/dashboard/top-videos-table";
import { RecommendationCards } from "@/components/dashboard/recommendation-cards";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

// Disable static optimization — selalu fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getLastScrape() {
  const job = await prisma.scrapeJob.findFirst({
    where: { status: "success" },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true, videosFound: true },
  });
  return job;
}

export default async function DashboardPage() {
  const [topVideos, recommendations, lastScrape] = await Promise.all([
    getTopVideos(10),
    getAllRecommendations(),
    getLastScrape(),
  ]);

  const lastUpdated = lastScrape
    ? formatDistanceToNow(lastScrape.startedAt, {
        addSuffix: true,
        locale: idLocale,
      })
    : "belum ada data";

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            TikTok Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Top 10 video + insight rekomendasi
          </p>
        </div>
        <RefreshButton />
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Last updated: {lastUpdated}
        {lastScrape && ` • ${lastScrape.videosFound} video tracked`}
      </p>

      <Separator className="my-6" />

      {/* Top 10 */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">
          Top 10 by Relevance Score
        </h2>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <TopVideosTable videos={topVideos} />
        </Suspense>
      </section>

      <Separator className="my-6" />

      {/* Recommendations */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Recommendations</h2>
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <RecommendationCards data={recommendations} />
        </Suspense>
      </section>
    </main>
  );
}
