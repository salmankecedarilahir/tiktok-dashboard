import NextAuth, { type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { z } from "zod";

import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "auth" });

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 hari
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          log.warn({ email }, "login: user not found");
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          log.warn({ email }, "login: bad password");
          return null;
        }

        log.info({ email, role: user.role }, "login: success");
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      // Defense terhadap token stale: kalau JWT lama (sebelum migration role)
      // dipakai, token.id / token.role bisa undefined. Return session tanpa
      // user supaya `auth()` & middleware (cek `!!auth?.user`) treat sebagai
      // unauthenticated → redirect ke /login → user re-issue token segar.
      if (typeof token.id !== "string" || !token.role) {
        log.warn({ tokenSub: token.sub }, "session: token missing id/role — invalidating");
        return { expires: session.expires } as unknown as Session;
      }
      session.user.id = token.id;
      session.user.role = token.role as Role;
      return session;
    },
  },
});
