-- CreateTable
CREATE TABLE "videos" (
    "id" UUID NOT NULL,
    "tiktok_id" TEXT NOT NULL,
    "caption" TEXT,
    "posted_at" TIMESTAMP(3) NOT NULL,
    "duration_seconds" INTEGER,
    "thumbnail_url" TEXT,
    "video_url" TEXT,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_snapshots" (
    "video_id" UUID NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "views" BIGINT NOT NULL,
    "likes" BIGINT NOT NULL,
    "comments_count" BIGINT NOT NULL,
    "shares" BIGINT NOT NULL DEFAULT 0,
    "saves" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "video_snapshots_pkey" PRIMARY KEY ("video_id","captured_at")
);

-- CreateTable
CREATE TABLE "video_recommendations" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_jobs" (
    "id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "videos_found" INTEGER NOT NULL DEFAULT 0,
    "videos_new" INTEGER NOT NULL DEFAULT 0,
    "snapshots_added" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "duration_ms" INTEGER,

    CONSTRAINT "scrape_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "videos_tiktok_id_key" ON "videos"("tiktok_id");

-- CreateIndex
CREATE INDEX "videos_posted_at_idx" ON "videos"("posted_at" DESC);

-- CreateIndex
CREATE INDEX "videos_created_at_idx" ON "videos"("created_at" DESC);

-- CreateIndex
CREATE INDEX "video_snapshots_captured_at_idx" ON "video_snapshots"("captured_at" DESC);

-- CreateIndex
CREATE INDEX "video_recommendations_kind_generated_at_idx" ON "video_recommendations"("kind", "generated_at" DESC);

-- CreateIndex
CREATE INDEX "scrape_jobs_started_at_idx" ON "scrape_jobs"("started_at" DESC);

-- CreateIndex
CREATE INDEX "scrape_jobs_status_started_at_idx" ON "scrape_jobs"("status", "started_at" DESC);

-- AddForeignKey
ALTER TABLE "video_snapshots" ADD CONSTRAINT "video_snapshots_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
