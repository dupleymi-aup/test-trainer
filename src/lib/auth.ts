import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import { db } from "@/lib/db";
import { isEmailRateLimited } from "@/lib/email-rate-limit";
import { isLoginRateLimited } from "@/lib/login-rate-limit";
import { logger } from "@/lib/logger";

// Extend next-auth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      isActive?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string;
    isActive?: boolean;
    lastRoleCheck?: number;
    tokenIssuedAt?: number;
  }
}

const prisma = db as PrismaClient;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        login: { label: "Email или телефон", type: "text" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) return null;

        const login = credentials.login.trim();

        if (isLoginRateLimited(login)) {
          throw new Error("rate_limited");
        }

        const isPhone = /^\+?\d{10,15}$/.test(login.replace(/[\s()-]/g, ""));

        const user = await prisma.user.findFirst({
          where: isPhone ? { phone: login } : { email: login.toLowerCase() },
        });

        if (!user || !user.hashedPassword) {
          return null;
        }
        if (!user.isActive) {
          return null; // Block inactive users
        }
        if (user.deletedAt) {
          return null; // Block deleted users
        }

        const isValid = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatar,
          role: user.role,
          isActive: user.isActive,
        };
      },
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER || "",
      from: process.env.EMAIL_FROM || "noreply@test-trainer.ru",
      async sendVerificationRequest({ identifier, url, provider }) {
        if (isEmailRateLimited(identifier)) {
          throw new Error("rate_limited");
        }

        const nodemailer = await import("nodemailer");

        const serverConfig = provider.server as Record<string, string> | undefined;
        const server = typeof provider.server === "string"
          ? (() => {
              try {
                const parsed = new URL(provider.server);
                return {
                  host: parsed.hostname,
                  port: Number(parsed.port) || 587,
                  secure: parsed.port === "465",
                  user: parsed.username || undefined,
                  password: parsed.password || undefined,
                };
              } catch {
                return { host: "localhost", port: 587, secure: false };
              }
            })()
          : {
              host: serverConfig?.host ?? "localhost",
              port: Number(serverConfig?.port) || 587,
              secure: Number(serverConfig?.port) === 465,
              user: serverConfig?.user,
              password: serverConfig?.password,
            };

        const transporter = nodemailer.createTransport({
          host: server.host,
          port: server.port,
          secure: server.secure,
          auth: server.user && server.password
            ? { user: server.user, pass: server.password }
            : undefined,
        });

        await transporter.sendMail({
          to: identifier,
          from: provider.from,
          subject: `Sign in to Test Trainer`,
          text: `Sign in link: ${url}`,
          html: `<p>Sign in link: <a href="${url}">${url}</a></p>`,
        });
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Use role and isActive from authorize() result - no need for extra DB query
        const u = user as typeof user & { role?: string; isActive?: boolean };
        token.role = u.role ?? "STUDENT";
        token.isActive = u.isActive ?? true;
        token.lastRoleCheck = Date.now();
        token.tokenIssuedAt = Date.now();
      }

      // Revalidate role from DB every 5 minutes to catch role changes by admins
      const ROLE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
      if (token.id && (!token.lastRoleCheck || Date.now() - token.lastRoleCheck > ROLE_CHECK_INTERVAL)) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { role: true, isActive: true, deletedAt: true, lastSessionInvalidation: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.isActive = dbUser.isActive;
            // If user was deleted, invalidate token immediately
            if (dbUser.deletedAt) {
              token.id = "";
            }
            // If token was issued before session invalidation, force re-auth
            if (dbUser.lastSessionInvalidation && (!token.tokenIssuedAt || dbUser.lastSessionInvalidation.getTime() > token.tokenIssuedAt)) {
              // Clear token id — next request will be unauthorized, forcing re-login
              token.id = "";
            }
          }
          token.lastRoleCheck = Date.now();
        } catch {
          logger.warn("JWT revalidation: DB query failed, keeping cached role");
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.role = token.role ?? "STUDENT";
        session.user.isActive = token.isActive ?? true;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
