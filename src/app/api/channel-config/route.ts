import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getSessionOrThrow, requireRole, handleAuthError } from "@/lib/auth-helpers";

const log = createLogger({ module: "api/channel-config" });

const locationSchema = z.object({
  name: z.string().min(1).max(50),
  percent: z.number().min(0).max(100),
});

const configSchema = z.object({
  channelName: z.string().min(1).max(100),
  channelHandle: z.string().min(1).max(100),
  totalFollowers: z.coerce.number().int().nonnegative().default(0),
  femalePercent: z.coerce.number().min(0).max(100).default(0),
  malePercent: z.coerce.number().min(0).max(100).default(0),
  age18_24Percent: z.coerce.number().min(0).max(100).default(0),
  age25_34Percent: z.coerce.number().min(0).max(100).default(0),
  age35plusPercent: z.coerce.number().min(0).max(100).default(0),
  topLocations: z.array(locationSchema).max(10).default([]),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#DC2626"),
  tagline: z.string().max(200).nullable().optional(),
});

export async function GET() {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.ADMIN]);
    // ChannelConfig is singleton (1 row only for CAU)
    const config = await prisma.channelConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ config });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to fetch config");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.ADMIN]);
    const body = await req.json();
    const parsed = configSchema.parse(body);

    // Upsert: kalau udah ada config, update; kalau belum, create
    const existing = await prisma.channelConfig.findFirst();

    const data = {
      ...parsed,
      topLocations: parsed.topLocations,
      tagline: parsed.tagline ?? null,
    };

    const config = existing
      ? await prisma.channelConfig.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.channelConfig.create({ data });

    log.info({ id: config.id }, "Saved channel config");

    return NextResponse.json({ success: true, config });
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
    log.error({ error: msg }, "Failed to save config");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}