-- CreateTable
CREATE TABLE "contribution_plans" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "brand_name" TEXT,
    "total_amount" BIGINT NOT NULL DEFAULT 0,
    "objective" TEXT,
    "plan_type" TEXT,
    "how_to" TEXT,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contribution_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribution_plan_members" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "contribution_plan_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribution_tasks" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "order_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "details" TEXT,
    "is_all_team" BOOLEAN NOT NULL DEFAULT false,
    "assignees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,

    CONSTRAINT "contribution_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contribution_plans_created_at_idx" ON "contribution_plans"("created_at" DESC);

-- CreateIndex
CREATE INDEX "contribution_plan_members_plan_id_idx" ON "contribution_plan_members"("plan_id");

-- CreateIndex
CREATE INDEX "contribution_plan_members_user_id_idx" ON "contribution_plan_members"("user_id");

-- CreateIndex
CREATE INDEX "contribution_tasks_plan_id_idx" ON "contribution_tasks"("plan_id");

-- AddForeignKey
ALTER TABLE "contribution_plan_members" ADD CONSTRAINT "contribution_plan_members_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "contribution_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_plan_members" ADD CONSTRAINT "contribution_plan_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_tasks" ADD CONSTRAINT "contribution_tasks_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "contribution_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
