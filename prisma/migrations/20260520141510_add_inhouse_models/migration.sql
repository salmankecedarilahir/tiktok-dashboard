-- CreateTable
CREATE TABLE "inhouse_weekly_reports" (
    "id" UUID NOT NULL,
    "week_number" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "week_summary" TEXT,
    "generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inhouse_weekly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inhouse_videos" (
    "id" UUID NOT NULL,
    "tiktok_url" TEXT NOT NULL,
    "tiktok_video_id" TEXT NOT NULL,
    "caption" TEXT,
    "week_number" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "views" BIGINT NOT NULL DEFAULT 0,
    "likes" BIGINT NOT NULL DEFAULT 0,
    "comments" BIGINT NOT NULL DEFAULT 0,
    "shares" BIGINT NOT NULL DEFAULT 0,
    "evaluation" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "weekly_report_id" UUID,

    CONSTRAINT "inhouse_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inhouse_weekly_reports_year_month_week_number_idx" ON "inhouse_weekly_reports"("year", "month", "week_number");

-- CreateIndex
CREATE UNIQUE INDEX "inhouse_weekly_reports_week_number_month_year_key" ON "inhouse_weekly_reports"("week_number", "month", "year");

-- CreateIndex
CREATE INDEX "inhouse_videos_year_month_week_number_idx" ON "inhouse_videos"("year", "month", "week_number");

-- CreateIndex
CREATE INDEX "inhouse_videos_weekly_report_id_idx" ON "inhouse_videos"("weekly_report_id");

-- CreateIndex
CREATE UNIQUE INDEX "inhouse_videos_tiktok_video_id_week_number_month_year_key" ON "inhouse_videos"("tiktok_video_id", "week_number", "month", "year");

-- AddForeignKey
ALTER TABLE "inhouse_videos" ADD CONSTRAINT "inhouse_videos_weekly_report_id_fkey" FOREIGN KEY ("weekly_report_id") REFERENCES "inhouse_weekly_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
