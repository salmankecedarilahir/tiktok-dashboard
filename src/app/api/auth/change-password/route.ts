import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getSessionOrThrow, handleAuthError } from "@/lib/auth-helpers";

const log = createLogger({ module: "api/auth/change-password" });

const schema = z
  .object({
    currentPassword: z.string().min(1, "Password lama wajib diisi"),
    newPassword: z.string().min(8, "Password baru minimal 8 karakter"),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Password baru tidak cocok",
    path: ["confirmPassword"],
  });

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    // session.user.id berasal dari JWT yang kita populate sendiri — kalau
    // missing artinya token stale (session callback sebenarnya sudah handle,
    // tapi defensive di sini juga).
    if (!session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user) {
      // Session valid tapi user di-delete dari DB — anomali.
      log.warn({ userId: session.user.id }, "change-password: session user not in DB");
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const ok = await bcrypt.compare(parsed.currentPassword, user.passwordHash);
    if (!ok) {
      log.warn({ email: user.email }, "change-password: wrong current password");
      return NextResponse.json(
        { error: "Password lama tidak benar" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(parsed.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    log.info({ email: user.email }, "change-password: success");
    return NextResponse.json({ message: "Password berhasil diubah" });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return NextResponse.json(
        { error: first?.message ?? "Validation failed", details: err.issues },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Failed to change password");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
