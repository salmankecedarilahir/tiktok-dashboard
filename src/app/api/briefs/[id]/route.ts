import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getSessionOrThrow, requireRole, handleAuthError } from "@/lib/auth-helpers";

const log = createLogger({ module: "api/briefs/[id]" });

const BRIEF_STATUSES = [
  "INQUIRY",
  "NEGOTIATING",
  "CONFIRMED",
  "ACTIVE",
  "DONE",
  "ARCHIVED",
] as const;

const PACKAGE_TYPES = ["Mapres", "Kating Gaul", "Cumlaude", "Custom"] as const;

const patchSchema = z.object({
  brandName: z.string().min(1).max(100).optional(),
  brandContact: z.string().max(200).nullable().optional(),
  inquiryDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  source: z.string().max(50).nullable().optional(),
  status: z.enum(BRIEF_STATUSES).optional(),

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionOrThrow();
    const { id } = await params;

    const brief = await prisma.brief.findUnique({
      where: { id },
      include: {
        campaign: {
          select: { id: true, campaignName: true, brandName: true, startDate: true, endDate: true },
        },
      },
    });

    if (!brief) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    return NextResponse.json({
      brief: {
        ...brief,
        inquiryDate: brief.inquiryDate.toISOString(),
        startDate: brief.startDate?.toISOString() ?? null,
        endDate: brief.endDate?.toISOString() ?? null,
        createdAt: brief.createdAt.toISOString(),
        updatedAt: brief.updatedAt.toISOString(),
        campaign: brief.campaign
          ? {
              ...brief.campaign,
              startDate: brief.campaign.startDate.toISOString(),
              endDate: brief.campaign.endDate.toISOString(),
            }
          : null,
      },
    });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to get brief");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.ADMIN, Role.EDITOR]);
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.parse(body);

    const data: Record<string, unknown> = {};

    if (parsed.brandName !== undefined) data.brandName = parsed.brandName;
    if (parsed.brandContact !== undefined) data.brandContact = parsed.brandContact;
    if (parsed.inquiryDate !== undefined) data.inquiryDate = new Date(parsed.inquiryDate);
    if (parsed.source !== undefined) data.source = parsed.source;
    if (parsed.status !== undefined) data.status = parsed.status;

    if (parsed.campaignName !== undefined) data.campaignName = parsed.campaignName;
    if (parsed.description !== undefined) data.description = parsed.description;
    if (parsed.packageType !== undefined) data.packageType = parsed.packageType;
    if (parsed.customPrice !== undefined) data.customPrice = parsed.customPrice;
    if (parsed.deliverables !== undefined) data.deliverables = parsed.deliverables;
    if (parsed.startDate !== undefined) data.startDate = parsed.startDate ? new Date(parsed.startDate) : null;
    if (parsed.endDate !== undefined) data.endDate = parsed.endDate ? new Date(parsed.endDate) : null;
    if (parsed.viewsGuarantee !== undefined) data.viewsGuarantee = parsed.viewsGuarantee;
    if (parsed.requirements !== undefined) data.requirements = parsed.requirements;

    if (parsed.assignedTo !== undefined) data.assignedTo = parsed.assignedTo;
    if (parsed.internalNotes !== undefined) data.internalNotes = parsed.internalNotes;
    if (parsed.brandNotes !== undefined) data.brandNotes = parsed.brandNotes;

    const brief = await prisma.brief.update({
      where: { id },
      data,
    });

    log.info({ id, status: brief.status }, "Updated brief");

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
    log.error({ error: msg }, "Failed to update brief");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.ADMIN, Role.EDITOR]);
    const { id } = await params;
    await prisma.brief.delete({ where: { id } });
    log.info({ id }, "Deleted brief");
    return NextResponse.json({ success: true });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to delete brief");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}