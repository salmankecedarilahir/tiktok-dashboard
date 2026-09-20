import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_CONTRIBUTION_TASKS,
  DEFAULT_OBJECTIVE,
  DEFAULT_PLAN_TYPE,
  DEFAULT_HOW_TO,
} from "@/lib/contribution-template";

export interface CreateDraftPlanOptions {
  brandName: string;
  campaignName: string;
  totalAmount?: number | bigint | null;
  notes?: string | null;
  date?: Date;
  tx?: Prisma.TransactionClient;
}

/**
 * Creates a draft Contribution Plan automatically when a campaign is created
 * or when a brand deal/brief is converted into an active campaign.
 */
export async function createDraftContributionPlanForCampaign({
  brandName,
  campaignName,
  totalAmount = 0,
  notes = null,
  date = new Date(),
  tx,
}: CreateDraftPlanOptions) {
  const db = tx ?? prisma;

  // 1. Fetch internal system users as initial members
  const users = await db.user.findMany({
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  const membersToInsert = users.map((u) => ({
    name: u.name,
    userId: u.id,
    role: u.role,
  }));

  // 2. Prepare 13 standard tasks mapped to team members and default PICs
  const tasksToInsert = DEFAULT_CONTRIBUTION_TASKS.map((t) => {
    let assignees: string[] = [];
    if (t.isAllTeam) {
      assignees = membersToInsert.map((m) => m.name);
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

  const rawAmount = Math.round(Number(totalAmount) || 0);
  const planTitle = campaignName
    ? `Contribution Plan - ${campaignName}`
    : `Contribution Plan - ${brandName}`;

  // 3. Create the Draft Contribution Plan
  const plan = await db.contributionPlan.create({
    data: {
      title: planTitle,
      brandName,
      totalAmount: BigInt(rawAmount),
      objective: DEFAULT_OBJECTIVE,
      planType: DEFAULT_PLAN_TYPE,
      howTo: DEFAULT_HOW_TO,
      notes,
      date,
      status: "DRAFT",
      members: {
        create: membersToInsert.map((m) => ({
          name: m.name,
          userId: m.userId,
          role: m.role,
        })),
      },
      tasks: {
        create: tasksToInsert.map((t) => ({
          orderNumber: t.orderNumber,
          title: t.title,
          weight: t.weight,
          details: t.details,
          isAllTeam: t.isAllTeam,
          assignees: t.assignees,
          notes: t.notes,
        })),
      },
    },
    include: {
      members: { select: { id: true, name: true, role: true } },
      tasks: { orderBy: { orderNumber: "asc" } },
    },
  });

  return plan;
}
