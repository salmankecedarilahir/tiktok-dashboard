import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getSessionOrThrow, requireRole, handleAuthError } from "@/lib/auth-helpers";

const log = createLogger({ module: "api/briefs" });

const BRIEF_STATUSES = [
  "INQUIRY",
  "NEGOTIATING",
  "CONFIRMED",
  "ACTIVE",
  "DONE",
  "ARCHIVED",
] as const;

const PACKAGE_TYPES = ["Mapres", "Kating Gaul", "Cumlaude", "Custom"] as const;

const briefSchema = z.object({
  brandName: z.string().min(1).max(100),
  brandContact: z.string().max(200).nullable().optional(),
  inquiryDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  source: z.string().max(50).nullable().optional(),
  status: z.enum(BRIEF_STATUSES).default("INQUIRY"),

  campaignName: z.string().max(200).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  packageType: z.enum(PACKAGE_TYPES).nullable().optional(),
  customPrice: z.coerce.number().int().min(0).nullable().optional(),
  deliverables: z.string().max(2000).nullable().optional(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
  viewsGuarantee: z.coerce.number().int().min(0).nullable().optional(),
  requirements: z.string().max(2000).nullable().optional(),

  assignedTo: z.string().max(100).nullable().optional(),
  internalNotes: z.string().max(5000).nullable().optional(),
  brandNotes: z.string().max(5000).nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await getSessionOrThrow();
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    const where = statusFilter && BRIEF_STATUSES.includes(statusFilter as typeof BRIEF_STATUSES[number])
      ? { status: statusFilter as typeof BRIEF_STATUSES[number] }
      : {};

    const briefs = await prisma.brief.findMany({
      where,
      include: {
        campaign: {
          select: { id: true, campaignName: true, brandName: true },
        },
      },
      orderBy: [
        { status: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      briefs: briefs.map((b) => ({
        ...b,
        inquiryDate: b.inquiryDate.toISOString(),
        startDate: b.startDate?.toISOString() ?? null,
        endDate: b.endDate?.toISOString() ?? null,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to list briefs");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.ADMIN, Role.EDITOR]);
    const body = await req.json();
    const parsed = briefSchema.parse(body);

    const brief = await prisma.brief.create({
      data: {
        brandName: parsed.brandName,
        brandContact: parsed.brandContact ?? null,
        inquiryDate: new Date(parsed.inquiryDate),
        source: parsed.source ?? null,
        status: parsed.status,

        campaignName: parsed.campaignName ?? null,
        description: parsed.description ?? null,
        packageType: parsed.packageType ?? null,
        customPrice: parsed.customPrice ?? null,
        deliverables: parsed.deliverables ?? null,
        startDate: parsed.startDate ? new Date(parsed.startDate) : null,
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
        viewsGuarantee: parsed.viewsGuarantee ?? null,
        requirements: parsed.requirements ?? null,

        assignedTo: parsed.assignedTo ?? null,
        internalNotes: parsed.internalNotes ?? null,
        brandNotes: parsed.brandNotes ?? null,
      },
    });

    log.info({ id: brief.id, brand: brief.brandName, status: brief.status }, "Created brief");

    return NextResponse.json({
      success: true,
      brief: {
        ...brief,
        inquiryDate: brief.inquiryDate.toISOString(),
        startDate: brief.startDate?.toISOString() ?? null,
        endDate: brief.endDate?.toISOString() ?? null,
        createdAt: brief.createdAt.toISOString(),
        updatedAt: brief.updatedAt.toISOString(),
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
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to create brief");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}