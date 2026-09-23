import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";

import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getSessionOrThrow, handleAuthError } from "@/lib/auth-helpers";
import {
  ContributionPlanReportPDF,
  ContributionPlanReportData,
} from "@/components/pdf/ContributionPlanReport";
import { calculateContribution } from "@/lib/contribution-template";

const log = createLogger({ module: "api/inhouse/contributions/[id]/pdf" });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionOrThrow();
    const { id } = await params;

    const plan = await prisma.contributionPlan.findUnique({
      where: { id },
      include: {
        members: { orderBy: { name: "asc" } },
        tasks: { orderBy: { orderNumber: "asc" } },
        productionCosts: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Contribution plan tidak ditemukan" },
        { status: 404 }
      );
    }

    const totalAmount = Number(plan.totalAmount);
    const serializedProductionCosts = (plan.productionCosts || []).map((c) => ({
      id: c.id,
      notes: c.notes || "",
      totalAmount: Number(c.totalAmount),
      splits: Array.isArray(c.splits) ? c.splits : [],
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    const calculation = calculateContribution(
      totalAmount,
      plan.members.map((m) => ({ name: m.name, userId: m.userId })),
      plan.tasks.map((t) => ({
        title: t.title,
        weight: t.weight,
        isAllTeam: t.isAllTeam,
        assignees: t.assignees,
      })),
      serializedProductionCosts
    );

    const channelConfig = await prisma.channelConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    const pdfData: ContributionPlanReportData = {
      title: plan.title,
      brandName: plan.brandName,
      totalAmount,
      objective: plan.objective,
      planType: plan.planType,
      howTo: plan.howTo,
      notes: plan.notes,
      date: plan.date ? plan.date.toISOString() : new Date().toISOString(),
      status: plan.status || "ACTIVE",
      channelConfig: {
        channelName: channelConfig?.channelName || "Circle Anak UPN",
        channelHandle: channelConfig?.channelHandle || "@abangabanganthis",
      },
      members: plan.members.map((m) => ({
        name: m.name,
        role: m.role,
      })),
      tasks: plan.tasks.map((t) => ({
        orderNumber: t.orderNumber,
        title: t.title,
        weight: t.weight,
        details: t.details,
        isAllTeam: t.isAllTeam,
        assignees: t.assignees,
        notes: t.notes,
      })),
      productionCosts: serializedProductionCosts.map((c) => ({
        notes: c.notes,
        totalAmount: c.totalAmount,
        splits: Array.isArray(c.splits) ? (c.splits as any) : [],
      })),
      calculation: {
        totalProductionCost: calculation.totalProductionCost,
        netBrandAmount: calculation.netBrandAmount,
        totalAllocatedPercentage: calculation.totalAllocatedPercentage,
        totalAllocatedAmount: calculation.totalAllocatedAmount,
        unallocatedPercentage: calculation.unallocatedPercentage,
        unallocatedAmount: calculation.unallocatedAmount,
        totalDistributedAmount: calculation.totalDistributedAmount,
        memberResults: calculation.memberResults.map((m) => ({
          name: m.name,
          percentage: m.percentage,
          feeFromPercentage: m.feeFromPercentage,
          productionCost: m.productionCost,
          amount: m.amount,
        })),
      },
    };

    const pdfStream = await renderToStream(
      ContributionPlanReportPDF({ data: pdfData })
    );

    log.info({ id, title: plan.title }, "Generated contribution plan PDF");

    const safeTitle = plan.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const filename = `${safeTitle || "contribution-plan"}.pdf`;

    return new NextResponse(pdfStream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to generate contribution PDF");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
