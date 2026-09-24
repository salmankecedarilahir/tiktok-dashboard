-- CreateTable
CREATE TABLE "contribution_production_costs" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "notes" TEXT,
    "total_amount" BIGINT NOT NULL DEFAULT 0,
    "splits" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contribution_production_costs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contribution_production_costs_plan_id_idx" ON "contribution_production_costs"("plan_id");

-- AddForeignKey
ALTER TABLE "contribution_production_costs" ADD CONSTRAINT "contribution_production_costs_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "contribution_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
