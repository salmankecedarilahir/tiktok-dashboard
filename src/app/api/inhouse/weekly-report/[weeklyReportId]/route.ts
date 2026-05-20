import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getSessionOrThrow, handleAuthError } from "@/lib/auth-helpers";

const log = createLogger({ module: "api/inhouse/weekly-report/[id]" });

const patchSchema = z.object({
  weekSummary: z.string().max(5000),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ weeklyReportId: string }> }
) {
  try {
    await getSessionOrThrow();
    const { weeklyReportId } = await params;
    const body = await req.json();
    const parsed = patchSchema.parse(body);

    const report = await prisma.inhouseWeeklyReport.update({
      where: { id: weeklyReportId },
      data: { weekSummary: parsed.weekSummary },
    });

    log.info({ id: weeklyReportId }, "Updated weekly report summary");

    return NextResponse.json({
      success: true,
      weeklyReport: {
        id: report.id,
        weekNumber: report.weekNumber,
        month: report.month,
        year: report.year,
        weekSummary: report.weekSummary,
        generatedAt: report.generatedAt ? report.generatedAt.toISOString() : null,
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: err.issues },
        { status: 400 }
      );
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Weekly report not found" },
        { status: 404 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to update weekly report");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
