import { z } from "zod";
import { eq } from "drizzle-orm";
import { users } from "../db/schema.js";
import { createSession, SESSION_COOKIE, SESSION_SECONDS } from "./auth.js";
import { isSecureRequest, serializeCookie } from "./cookies.js";
import { libraryRouter } from "./routers/library.js";
import { getDb } from "./db.js";
import { verifyPassword, hashPassword } from "./password.js";
import { publicProcedure, router } from "./trpc.js";

const normalizeStudentId = (value: string) => {
  const compact = value.trim().replace(/\s+/g, "");
  if (!/^\d{8}$/.test(compact) && !/^\d{2}-\d{6}$/.test(compact)) return null;
  return compact.replace("-", "").replace(/^(\d{2})(\d{6})$/, "$1-$2");
};
const studentId = z.string().trim().transform(normalizeStudentId).refine((value): value is string => Boolean(value), "Enter your student ID in the format 12-345678.");
const accountResult = (account: { id: number; name: string | null; studentId: string | null; role: "user" | "admin" }) => ({ id: account.id, name: account.name, username: account.studentId, role: account.role });
function dbOrError() { const db = getDb(); if (!db) throw new Error("The library database is not available yet."); return db; }

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user ? accountResult(ctx.user) : null),
    login: publicProcedure.input(z.object({ identifier: z.string().trim().min(1).max(80), password: z.string().min(1).max(128) })).mutation(async ({ input, ctx }) => {
      const db = dbOrError();
      const normalizedIdentifier = normalizeStudentId(input.identifier);
      const [account] = normalizedIdentifier ? await db.select().from(users).where(eq(users.studentId, normalizedIdentifier)).limit(1) : [];
      const [fallback] = account ? [account] : await db.select().from(users).where(eq(users.username, input.identifier)).limit(1);
      if (!fallback || !verifyPassword(fallback.passwordHash, input.password)) throw new Error("ID number or password is incorrect.");
      const token = await createSession(fallback.id);
      ctx.resHeaders.append("Set-Cookie", serializeCookie(SESSION_COOKIE, token, { maxAgeSeconds: SESSION_SECONDS, secure: isSecureRequest(ctx.req) }));
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, fallback.id));
      return accountResult(fallback);
    }),
    signup: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(120), studentId, password: z.string().min(8).max(128) })).mutation(async ({ input, ctx }) => {
      const db = dbOrError();
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.studentId, input.studentId)).limit(1);
      if (existing) throw new Error("That student ID is already registered.");
      const [account] = await db.insert(users).values({ username: input.studentId, studentId: input.studentId, name: input.name, email: `${input.studentId}@students.eui.edu.eg`, loginMethod: "password", passwordHash: hashPassword(input.password), role: "user" }).returning();
      const token = await createSession(account.id);
      ctx.resHeaders.append("Set-Cookie", serializeCookie(SESSION_COOKIE, token, { maxAgeSeconds: SESSION_SECONDS, secure: isSecureRequest(ctx.req) }));
      return accountResult(account);
    }),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.resHeaders.append("Set-Cookie", serializeCookie(SESSION_COOKIE, "", { maxAgeSeconds: 0, secure: isSecureRequest(ctx.req) })); return { success: true } as const; }),
  }),
  library: libraryRouter,
});
export type AppRouter = typeof appRouter;
