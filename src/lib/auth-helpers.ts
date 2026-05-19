import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import type { Session } from "next-auth";

import { auth } from "@/auth";

/**
 * Subclass `Response` agar bisa di-throw dan ditangkap di `withAuth` wrapper.
 * Pattern ini lebih ergonomis daripada early-return di setiap handler.
 */
export class AuthError extends Error {
  constructor(
    public readonly response: NextResponse,
    message: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Ambil session aktif. Throw 401 kalau tidak ada user yang login.
 */
export async function getSessionOrThrow(): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    throw new AuthError(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      "Unauthorized"
    );
  }
  return session;
}

/**
 * Validasi bahwa role user ada di list yang diizinkan. Throw 403 kalau tidak.
 */
export function requireRole(session: Session, allowed: Role[]): void {
  const role = session.user?.role;
  if (!role || !allowed.includes(role)) {
    throw new AuthError(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      `Forbidden (role=${role ?? "none"}, allowed=${allowed.join(",")})`
    );
  }
}

/**
 * Convenience: handle AuthError lemparan di catch block route handler.
 * Return NextResponse-nya kalau memang AuthError; lempar ulang kalau bukan.
 */
export function handleAuthError(err: unknown): NextResponse | null {
  if (err instanceof AuthError) return err.response;
  return null;
}
