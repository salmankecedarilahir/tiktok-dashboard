import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSessionOrThrow, handleAuthError } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await getSessionOrThrow();
    const active = await prisma.brief.count({
      where: {
        status: {
          in: ["INQUIRY", "NEGOTIATING", "CONFIRMED", "ACTIVE"],
        },
      },
    });

    return NextResponse.json({ active });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, active: 0 }, { status: 500 });
  }
}
