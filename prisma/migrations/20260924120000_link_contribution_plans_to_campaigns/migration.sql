ALTER TABLE "contribution_plans" ADD COLUMN "campaign_id" UUID;

CREATE UNIQUE INDEX "contribution_plans_campaign_id_key" ON "contribution_plans"("campaign_id");

ALTER TABLE "contribution_plans" ADD CONSTRAINT "contribution_plans_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
