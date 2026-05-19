-- CreateTable
CREATE TABLE "daily_metrics" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "video_views" BIGINT NOT NULL,
    "profile_views" BIGINT NOT NULL,
    "likes" BIGINT NOT NULL,
    "comments" BIGINT NOT NULL,
    "shares" BIGINT NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_config" (
    "id" UUID NOT NULL,
    "channel_name" TEXT NOT NULL,
    "channel_handle" TEXT NOT NULL,
    "total_followers" INTEGER NOT NULL DEFAULT 0,
    "female_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "male_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "age_18_24_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "age_25_34_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "age_35_plus_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "top_locations" JSONB NOT NULL DEFAULT '[]',
    "brand_color" TEXT NOT NULL DEFAULT '#DC2626',
    "tagline" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "brand_name" TEXT NOT NULL,
    "brand_logo_url" TEXT,
    "campaign_name" TEXT NOT NULL,
    "package_type" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_videos" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "video_title" TEXT NOT NULL,
    "video_url" TEXT,
    "posted_at" TIMESTAMP(3) NOT NULL,
    "duration_seconds" INTEGER,
    "views" BIGINT NOT NULL,
    "likes" BIGINT NOT NULL,
    "comments" BIGINT NOT NULL,
    "shares" BIGINT NOT NULL,
    "saves" BIGINT NOT NULL DEFAULT 0,
    "watch_time_avg_sec" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_metrics_date_idx" ON "daily_metrics"("date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "daily_metrics_date_key" ON "daily_metrics"("date");

-- CreateIndex
CREATE INDEX "campaigns_created_at_idx" ON "campaigns"("created_at" DESC);

-- CreateIndex
CREATE INDEX "campaign_videos_campaign_id_idx" ON "campaign_videos"("campaign_id");

-- AddForeignKey
ALTER TABLE "campaign_videos" ADD CONSTRAINT "campaign_videos_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
