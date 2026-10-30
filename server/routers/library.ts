import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { libraryBooks, libraryExtensions, libraryLoans, users } from "../../db/schema.js";
import { createDemoSession, DEMO_COOKIE, DEMO_SESSION_SECONDS } from "../auth.js";
import { isSecureRequest, serializeCookie } from "../cookies.js";
import { getDb } from "../db.js";
import { verifyDemoPassword } from "../password.js";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../trpc.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const dbOrError = () => {
  const db = getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The library database is not available yet." });
  return db;
};

/** Escape LIKE wildcards so a search for "100%" or "a_b" is taken literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

const bookInput = z.object({
  title: z.string().trim().min(1).max(240),
  author: z.string().trim().min(1).max(180),
  category: z.string().trim().min(1).max(80),
  isbn: z.string().trim().max(32).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  callNumber: z.string().trim().min(1).max(48),
  shelf: z.string().trim().min(1).max(24),
  shelfRow: z.number().int().min(0).max(5),
  shelfSlot: z.number().int().min(0).max(15),
  coverColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const libraryRouter = router({
  demoLogin: publicProcedure
    .input(z.object({ username: z.string().trim().min(1).max(40), password: z.string().min(1).max(128) }))
    .mutation(async ({ input, ctx }) => {
      const db = dbOrError();
      const [account] = await db.select().from(users).where(eq(users.username, input.username)).limit(1);
      const isDemo = account?.loginMethod === "demo-only";
      const passwordOk = verifyDemoPassword(isDemo ? account?.passwordHash : null, input.password);
      if (!account || !isDemo || !passwordOk) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Those demo credentials did not match." });
      }
      const token = await createDemoSession(account.id);
      ctx.resHeaders.append("Set-Cookie", serializeCookie(DEMO_COOKIE, token, { maxAgeSeconds: DEMO_SESSION_SECONDS, secure: isSecureRequest(ctx.req) }));
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, account.id));
      return { id: account.id, name: account.name, username: account.username, role: account.role };
    }),

  books: publicProcedure
    .input(z.object({ search: z.string().trim().max(100).optional() }).optional())
    .query(async ({ input }) => {
      const db = dbOrError();
      const term = input?.search?.trim();
      if (!term) return db.select().from(libraryBooks).orderBy(asc(libraryBooks.title));
      const pattern = `%${escapeLike(term)}%`;
      return db.select().from(libraryBooks)
        .where(or(ilike(libraryBooks.title, pattern), ilike(libraryBooks.author, pattern), ilike(libraryBooks.category, pattern), ilike(libraryBooks.callNumber, pattern)))
        .orderBy(asc(libraryBooks.title));
    }),

  book: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const db = dbOrError();
    const [book] = await db.select().from(libraryBooks).where(eq(libraryBooks.id, input.id)).limit(1);
    if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "This book is no longer in the catalogue." });
    return book;
  }),

  myLoans: protectedProcedure.query(async ({ ctx }) => {
    const db = dbOrError();
    const rows = await db.select({ loan: libraryLoans, book: libraryBooks, extension: libraryExtensions })
      .from(libraryLoans)
      .innerJoin(libraryBooks, eq(libraryLoans.bookId, libraryBooks.id))
      .leftJoin(libraryExtensions, eq(libraryExtensions.loanId, libraryLoans.id))
      .where(eq(libraryLoans.userId, ctx.user.id))
      .orderBy(desc(libraryLoans.borrowedAt));
    return rows.map(({ loan, book, extension }) => ({ ...loan, book, extension }));
  }),

  borrow: protectedProcedure.input(z.object({ bookId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = dbOrError();
    return db.transaction(async (tx) => {
      const [book] = await tx.select().from(libraryBooks).where(eq(libraryBooks.id, input.bookId)).limit(1).for("update");
      if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "That book is no longer available." });
      if (book.status !== "available") throw new TRPCError({ code: "CONFLICT", message: "That book is already lent out." });
      const [activeLoan] = await tx.select({ id: libraryLoans.id }).from(libraryLoans)
        .where(and(eq(libraryLoans.bookId, book.id), eq(libraryLoans.status, "active"))).limit(1);
      if (activeLoan) throw new TRPCError({ code: "CONFLICT", message: "That book already has an active loan." });
      const now = new Date();
      const dueAt = new Date(now.getTime() + WEEK_MS);
      const [loan] = await tx.insert(libraryLoans).values({ bookId: book.id, userId: ctx.user.id, borrowedAt: now, dueAt, status: "active" }).returning({ id: libraryLoans.id });
      await tx.update(libraryBooks).set({ status: "lent" }).where(eq(libraryBooks.id, book.id));
      return { loanId: loan.id, dueAt };
    });
  }),

  requestExtension: protectedProcedure.input(z.object({ loanId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = dbOrError();
    const [loan] = await db.select().from(libraryLoans).where(and(eq(libraryLoans.id, input.loanId), eq(libraryLoans.userId, ctx.user.id))).limit(1);
    if (!loan || loan.status !== "active") throw new TRPCError({ code: "NOT_FOUND", message: "No active loan was found for this account." });
    const [existing] = await db.select({ id: libraryExtensions.id }).from(libraryExtensions).where(eq(libraryExtensions.loanId, loan.id)).limit(1);
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "An extension has already been requested for this loan." });
    await db.insert(libraryExtensions).values({ loanId: loan.id, userId: ctx.user.id, status: "pending" });
    return { success: true } as const;
  }),

  returnBook: protectedProcedure.input(z.object({ loanId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = dbOrError();
    return db.transaction(async (tx) => {
      const [loan] = await tx.select().from(libraryLoans).where(and(eq(libraryLoans.id, input.loanId), eq(libraryLoans.userId, ctx.user.id))).limit(1);
      if (!loan || loan.status !== "active") throw new TRPCError({ code: "NOT_FOUND", message: "No active loan was found for this account." });
      await tx.update(libraryLoans).set({ status: "returned", returnedAt: new Date() }).where(eq(libraryLoans.id, loan.id));
      await tx.update(libraryBooks).set({ status: "available" }).where(eq(libraryBooks.id, loan.bookId));
      return { success: true } as const;
    });
  }),

  admin: router({
    requests: adminProcedure.query(async () => {
      const db = dbOrError();
      const rows = await db.select({ extension: libraryExtensions, loan: libraryLoans, book: libraryBooks, user: users })
        .from(libraryExtensions)
        .innerJoin(libraryLoans, eq(libraryExtensions.loanId, libraryLoans.id))
        .innerJoin(libraryBooks, eq(libraryLoans.bookId, libraryBooks.id))
        .innerJoin(users, eq(libraryExtensions.userId, users.id))
        .orderBy(desc(libraryExtensions.requestedAt));
      return rows.map(({ extension, loan, book, user }) => ({ ...extension, loan, book, readerName: user.name ?? user.username ?? "Reader" }));
    }),

    addBook: adminProcedure.input(bookInput).mutation(async ({ input }) => {
      const db = dbOrError();
      const [created] = await db.insert(libraryBooks).values({ ...input, status: "available" }).returning({ id: libraryBooks.id });
      return { id: created.id };
    }),

    removeBook: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const db = dbOrError();
      const [activeLoan] = await db.select({ id: libraryLoans.id }).from(libraryLoans).where(and(eq(libraryLoans.bookId, input.id), eq(libraryLoans.status, "active"))).limit(1);
      if (activeLoan) throw new TRPCError({ code: "CONFLICT", message: "Return the active loan before removing this book." });
      await db.delete(libraryBooks).where(eq(libraryBooks.id, input.id));
      return { success: true } as const;
    }),

    setStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["available", "lent"]) })).mutation(async ({ input }) => {
      const db = dbOrError();
      return db.transaction(async (tx) => {
        const [book] = await tx.select().from(libraryBooks).where(eq(libraryBooks.id, input.id)).limit(1).for("update");
        if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "This book is no longer in the inventory." });
        if (input.status === "available") {
          const [activeLoan] = await tx.select({ id: libraryLoans.id }).from(libraryLoans)
            .where(and(eq(libraryLoans.bookId, input.id), eq(libraryLoans.status, "active"))).limit(1);
          if (activeLoan) throw new TRPCError({ code: "CONFLICT", message: "Return the active loan before marking this book available." });
        }
        await tx.update(libraryBooks).set({ status: input.status }).where(eq(libraryBooks.id, input.id));
        return { success: true } as const;
      });
    }),

    decideExtension: adminProcedure.input(z.object({ extensionId: z.number().int().positive(), decision: z.enum(["approved", "declined"]) })).mutation(async ({ input, ctx }) => {
      const db = dbOrError();
      return db.transaction(async (tx) => {
        const [extension] = await tx.select().from(libraryExtensions).where(eq(libraryExtensions.id, input.extensionId)).limit(1).for("update");
        if (!extension || extension.status !== "pending") throw new TRPCError({ code: "NOT_FOUND", message: "This extension request is no longer pending." });
        if (input.decision === "approved") {
          const [loan] = await tx.select().from(libraryLoans).where(eq(libraryLoans.id, extension.loanId)).limit(1);
          if (!loan || loan.status !== "active") throw new TRPCError({ code: "CONFLICT", message: "This book is no longer on an active loan." });
          await tx.update(libraryLoans).set({ dueAt: new Date(loan.dueAt.getTime() + WEEK_MS) }).where(eq(libraryLoans.id, loan.id));
        }
        await tx.update(libraryExtensions).set({ status: input.decision, resolvedAt: new Date(), resolvedBy: ctx.user.id }).where(eq(libraryExtensions.id, extension.id));
        return { success: true } as const;
      });
    }),
  }),
});
