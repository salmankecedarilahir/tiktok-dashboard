import NextAuth from "next-auth";
import authConfig from "@/auth.config";

// Edge-compatible: pakai authConfig saja (tanpa Prisma / bcrypt).
// Semua logic allow / redirect ada di authConfig.callbacks.authorized.
export default NextAuth(authConfig).auth;

export const config = {
  // Lindungi /dashboard/*. /login, /, dan /api/auth dilepas.
  matcher: ["/dashboard/:path*"],
};
