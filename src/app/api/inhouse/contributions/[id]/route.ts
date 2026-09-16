import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrThrow, handleAuthError } from "@/lib/auth-helpers";
import { createLogger } from "@/lib/logger";
import { calculateContribution } from "@/lib/contribution-template";

const log = createLogger({ module: "api/inhouse/contributions/[id]" });

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
        members: {
          orderBy: { name: "asc" },
        },
        tasks: {
          orderBy: { orderNumber: "asc" },
        },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Contribution plan tidak ditemukan" },
        { status: 404 }
      );
    }

    const totalAmount = Number(plan.totalAmount);
    const calculation = calculateContribution(
      totalAmount,
      plan.members.map((m) => ({ name: m.name, userId: m.userId })),
      plan.tasks.map((t) => ({
        title: t.title,
        weight: t.weight,
        isAllTeam: t.isAllTeam,
        assignees: t.assignees,
      }))
    );

    return NextResponse.json({
      plan: {
        ...plan,
        totalAmount,
      },
      calculation,
    });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to get contribution plan");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionOrThrow();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.contributionPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Contribution plan tidak ditemukan" },
        { status: 404 }
      );
    }

    const {
      title,
      brandName,
      totalAmount,
      objective,
      planType,
      howTo,
      notes,
      date,
      status,
      members,
      tasks,
    } = body;

    // Use a transaction to update plan, delete old members/tasks, and recreate them
    await prisma.$transaction(async (tx) => {
      // 1. Update main plan fields
      await tx.contributionPlan.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(brandName !== undefined && { brandName }),
          ...(totalAmount !== undefined && {
            totalAmount: BigInt(Math.round(Number(totalAmount) || 0)),
          }),
          ...(objective !== undefined && { objective }),
          ...(planType !== undefined && { planType }),
          ...(howTo !== undefined && { howTo }),
          ...(notes !== undefined && { notes }),
          ...(status !== undefined && { status }),
          ...(date !== undefined && { date: new Date(date) }),
        },
      });

      // 2. If members are passed, replace them
      if (Array.isArray(members)) {
        await tx.contributionPlanMember.deleteMany({
          where: { planId: id },
        });

        if (members.length > 0) {
          await tx.contributionPlanMember.createMany({
            data: members.map(
              (m: {
                name: string;
                userId?: string | null;
                role?: string | null;
              }) => ({
                planId: id,
                name: m.name,
                userId: m.userId || null,
                role: m.role || null,
              })
            ),
          });
        }
      }

      // 3. If tasks are passed, replace them
      if (Array.isArray(tasks)) {
        await tx.contributionTask.deleteMany({
          where: { planId: id },
        });

        if (tasks.length > 0) {
          await tx.contributionTask.createMany({
            data: tasks.map(
              (
                t: {
                  orderNumber?: number;
                  title: string;
                  weight: number;
                  details?: string | null;
                  isAllTeam?: boolean;
                  assignees?: string[];
                  notes?: string | null;
                },
                idx: number
              ) => ({
                planId: id,
                orderNumber: t.orderNumber ?? idx + 1,
                title: t.title,
                weight: Number(t.weight) || 0,
                details: t.details || "",
                isAllTeam: !!t.isAllTeam,
                assignees: Array.isArray(t.assignees) ? t.assignees : [],
                notes: t.notes || "",
              })
            ),
          });
        }
      }
    });

    const updated = await prisma.contributionPlan.findUnique({
      where: { id },
      include: {
        members: { orderBy: { name: "asc" } },
        tasks: { orderBy: { orderNumber: "asc" } },
      },
    });

    const numericTotal = Number(updated?.totalAmount ?? 0);
    const calculation = updated
      ? calculateContribution(
          numericTotal,
          updated.members.map((m) => ({ name: m.name, userId: m.userId })),
          updated.tasks.map((t) => ({
            title: t.title,
            weight: t.weight,
            isAllTeam: t.isAllTeam,
            assignees: t.assignees,
          }))
        )
      : null;

    log.info({ planId: id }, "Updated contribution plan");

    return NextResponse.json({
      plan: {
        ...updated,
        totalAmount: numericTotal,
      },
      calculation,
    });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to update contribution plan");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionOrThrow();
    const { id } = await params;

    await prisma.contributionPlan.delete({
      where: { id },
    });

    log.info({ planId: id }, "Deleted contribution plan");
    return NextResponse.json({ success: true });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to delete contribution plan");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
