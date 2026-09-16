import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrThrow, handleAuthError } from "@/lib/auth-helpers";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "api/users" });

export async function GET() {
  try {
    await getSessionOrThrow();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ users });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to fetch users");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
