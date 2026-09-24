import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionOrThrow, requireRole, handleAuthError } from "@/lib/auth-helpers";
import { createLogger } from "@/lib/logger";
import {
  DEFAULT_CONTRIBUTION_TASKS,
  DEFAULT_OBJECTIVE,
  DEFAULT_PLAN_TYPE,
  DEFAULT_HOW_TO,
} from "@/lib/contribution-template";

const log = createLogger({ module: "api/inhouse/contributions" });

export async function GET() {
  try {
    await getSessionOrThrow();

    const plans = await prisma.contributionPlan.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        members: {
          select: { id: true, name: true, role: true, userId: true },
        },
        tasks: {
          orderBy: { orderNumber: "asc" },
        },
      },
    });

    const serializedPlans = plans.map((p) => ({
      ...p,
      totalAmount: Number(p.totalAmount),
    }));

    return NextResponse.json({ plans: serializedPlans });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to fetch contribution plans");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.ADMIN, Role.EDITOR]);
    const body = await req.json();

    const {
      title = "Contribution Plan CAU",
      brandName = null,
      totalAmount = 1000000,
      objective = DEFAULT_OBJECTIVE,
      planType = DEFAULT_PLAN_TYPE,
      howTo = DEFAULT_HOW_TO,
      notes = null,
      date = new Date(),
      useDefaultTemplate = true,
      customMembers = [],
      customTasks = [],
    } = body;

    // Determine members: if customMembers provided, use them; otherwise fetch internal users
    let membersToInsert = customMembers;
    if (!membersToInsert || membersToInsert.length === 0) {
      const users = await prisma.user.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      membersToInsert = users.map((u) => ({
        name: u.name,
        userId: u.id,
      }));
    }

    // Determine tasks: if customTasks provided, use them; otherwise use DEFAULT_CONTRIBUTION_TASKS
    let tasksToInsert = customTasks;
    if (useDefaultTemplate && (!tasksToInsert || tasksToInsert.length === 0)) {
      tasksToInsert = DEFAULT_CONTRIBUTION_TASKS.map((t) => {
        let assignees: string[] = [];
        if (t.isAllTeam) {
          assignees = membersToInsert.map((m: { name: string }) => m.name);
        } else if (t.defaultPic) {
          assignees = [t.defaultPic];
        }
        return {
          orderNumber: t.orderNumber,
          title: t.title,
          weight: t.weight,
          details: t.details,
          isAllTeam: t.isAllTeam,
          assignees,
          notes: t.notes ?? "",
        };
      });
    }

    const plan = await prisma.contributionPlan.create({
      data: {
        title,
        brandName,
        totalAmount: BigInt(Math.round(Number(totalAmount) || 0)),
        objective,
        planType,
        howTo,
        notes,
        date: new Date(date),
        members: {
          create: membersToInsert.map(
            (m: { name: string; userId?: string | null; role?: string | null }) => ({
              name: m.name,
              userId: m.userId || null,
              role: m.role || null,
            })
          ),
        },
        tasks: {
          create: tasksToInsert.map(
            (
              t: {
                orderNumber: number;
                title: string;
                weight: number;
                details?: string | null;
                isAllTeam?: boolean;
                assignees?: string[];
                notes?: string | null;
              },
              idx: number
            ) => ({
              orderNumber: t.orderNumber ?? idx + 1,
              title: t.title,
              weight: Number(t.weight) || 0,
              details: t.details || "",
              isAllTeam: !!t.isAllTeam,
              assignees: Array.isArray(t.assignees) ? t.assignees : [],
              notes: t.notes || "",
            })
          ),
        },
      },
      include: {
        members: true,
        tasks: { orderBy: { orderNumber: "asc" } },
      },
    });

    log.info({ planId: plan.id, title: plan.title }, "Created contribution plan");

    return NextResponse.json(
      {
        plan: {
          ...plan,
          totalAmount: Number(plan.totalAmount),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to create contribution plan");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
