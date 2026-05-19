-- CreateEnum
CREATE TYPE "BriefStatus" AS ENUM ('INQUIRY', 'NEGOTIATING', 'CONFIRMED', 'ACTIVE', 'DONE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "briefs" (
    "id" UUID NOT NULL,
    "brandName" TEXT NOT NULL,
    "brandContact" TEXT,
    "inquiryDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "status" "BriefStatus" NOT NULL DEFAULT 'INQUIRY',
    "campaignName" TEXT,
    "description" TEXT,
    "packageType" TEXT,
    "customPrice" INTEGER,
    "deliverables" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "viewsGuarantee" INTEGER,
    "requirements" TEXT,
    "assignedTo" TEXT,
    "internalNotes" TEXT,
    "brandNotes" TEXT,
    "campaignId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "briefs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "briefs_campaignId_key" ON "briefs"("campaignId");

-- CreateIndex
CREATE INDEX "briefs_status_idx" ON "briefs"("status");

-- CreateIndex
CREATE INDEX "briefs_createdAt_idx" ON "briefs"("createdAt");

-- AddForeignKey
ALTER TABLE "briefs" ADD CONSTRAINT "briefs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
