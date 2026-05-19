import type { NextAuthConfig } from "next-auth";

// Prefix-prefix yang khusus boleh diakses ADMIN saja.
const ADMIN_ONLY_PREFIXES = ["/dashboard/channel", "/dashboard/import"];

// File ini Edge-safe: TIDAK boleh import Prisma, bcrypt, atau apapun yang
// pakai Node API. Provider Credentials di-wire di src/auth.ts (Node runtime).
export default {
  pages: {
    signIn: "/login",
  },
  providers: [],
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isAuth = !!auth?.user;
      const path = nextUrl.pathname;
      const isOnDashboard = path.startsWith("/dashboard");

      if (!isOnDashboard) return true;
      if (!isAuth) return false; // → redirect ke pages.signIn

      const role = auth.user.role;
      const isAdminOnly = ADMIN_ONLY_PREFIXES.some((p) => path.startsWith(p));
      if (isAdminOnly && role !== "ADMIN") {
        return Response.redirect(new URL("/dashboard/campaigns", nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
