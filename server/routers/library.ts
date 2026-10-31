import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { libraryBooks, libraryExtensions, libraryLoans, users } from "../../db/schema.js";
import { createSession, SESSION_COOKIE, SESSION_SECONDS } from "../auth.js";
import { isSecureRequest, serializeCookie } from "../cookies.js";
import { getDb } from "../db.js";

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
  totalCopies: z.number().int().min(1).max(40).default(1),
  author: z.string().trim().min(1).max(180),
  category: z.string().trim().min(1).max(80),
  isbn: z.string().trim().max(32).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  callNumber: z.string().trim().min(1).max(48),
  shelf: z.enum(["A", "B", "C", "E", "F"]),
  shelfRow: z.number().int().min(0).max(3),
  shelfSlot: z.number().int().min(0).max(39).optional(),
  coverColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const libraryRouter = router({
  books: publicProcedure
    .input(z.object({ search: z.string().trim().max(100).optional() }).optional())
    .query(async ({ input }) => {
      const db = dbOrError();
      const term = input?.search?.trim();
      const pattern = term ? `%${escapeLike(term)}%` : undefined;
      const rows = await db.select().from(libraryBooks)
        .where(pattern ? or(ilike(libraryBooks.title, pattern), ilike(libraryBooks.author, pattern), ilike(libraryBooks.category, pattern), ilike(libraryBooks.callNumber, pattern)) : undefined)
        .orderBy(asc(libraryBooks.title));
      const loanRows = await db.select({ bookId: libraryLoans.bookId, status: libraryLoans.status }).from(libraryLoans)
        .where(or(eq(libraryLoans.status, "pending"), eq(libraryLoans.status, "active"), eq(libraryLoans.status, "return_pending")));
      const occupied = new Map<number, number>();
      for (const row of loanRows) occupied.set(row.bookId, (occupied.get(row.bookId) ?? 0) + 1);
      return rows.map(book => ({ ...book, status: (occupied.get(book.id) ?? 0) < book.totalCopies ? "available" as const : "lent" as const }));
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
      const occupied = await tx.select({ id: libraryLoans.id }).from(libraryLoans)
        .where(and(eq(libraryLoans.bookId, book.id), or(eq(libraryLoans.status, "active"), eq(libraryLoans.status, "pending"), eq(libraryLoans.status, "return_pending"))));
      if (occupied.length >= book.totalCopies) throw new TRPCError({ code: "CONFLICT", message: "All copies of that book are currently borrowed or reserved." });
      const [pending] = await tx.select({ id: libraryLoans.id }).from(libraryLoans).where(and(eq(libraryLoans.bookId, book.id), eq(libraryLoans.userId, ctx.user.id), eq(libraryLoans.status, "pending"))).limit(1);
      if (pending) throw new TRPCError({ code: "CONFLICT", message: "A request for this book is already waiting for the librarian." });
      const [activeLoan] = await tx.select({ id: libraryLoans.id }).from(libraryLoans)
        .where(and(eq(libraryLoans.bookId, book.id), eq(libraryLoans.status, "active"))).limit(1);
      if (activeLoan) throw new TRPCError({ code: "CONFLICT", message: "That book already has an active loan." });
      const now = new Date();
      const dueAt = new Date(now.getTime() + WEEK_MS);
      const [loan] = await tx.insert(libraryLoans).values({ bookId: book.id, userId: ctx.user.id, borrowedAt: now, dueAt, status: "pending" }).returning({ id: libraryLoans.id });
      return { loanId: loan.id, dueAt, pending: true };
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
      await tx.update(libraryLoans).set({ status: "return_pending" }).where(eq(libraryLoans.id, loan.id));
      return { success: true } as const;
    });
  }),

  admin: router({
    pendingBorrowRequests: adminProcedure.query(async () => {
      const db = dbOrError();
      const rows = await db.select({ loan: libraryLoans, book: libraryBooks, user: users }).from(libraryLoans).innerJoin(libraryBooks, eq(libraryLoans.bookId, libraryBooks.id)).innerJoin(users, eq(libraryLoans.userId, users.id)).where(eq(libraryLoans.status, "pending")).orderBy(desc(libraryLoans.createdAt));
      return rows.map(({ loan, book, user }) => ({ ...loan, book, student: { id: user.studentId ?? user.username, name: user.name, email: user.email } }));
    }),
    pendingReturns: adminProcedure.query(async () => {
      const db = dbOrError();
      const rows = await db.select({ loan: libraryLoans, book: libraryBooks, user: users }).from(libraryLoans).innerJoin(libraryBooks, eq(libraryLoans.bookId, libraryBooks.id)).innerJoin(users, eq(libraryLoans.userId, users.id)).where(eq(libraryLoans.status, "return_pending")).orderBy(desc(libraryLoans.createdAt));
      return rows.map(({ loan, book, user }) => ({ ...loan, book, student: { id: user.studentId ?? user.username, name: user.name, email: user.email } }));
    }),
    confirmReturn: adminProcedure.input(z.object({ loanId: z.number().int().positive() })).mutation(async ({ input }) => {
      const db = dbOrError();
      return db.transaction(async tx => {
        const [loan] = await tx.select().from(libraryLoans).where(and(eq(libraryLoans.id, input.loanId), eq(libraryLoans.status, "return_pending"))).limit(1).for("update");
        if (!loan) throw new TRPCError({ code: "NOT_FOUND", message: "This return is no longer awaiting confirmation." });
        await tx.update(libraryLoans).set({ status: "returned", returnedAt: new Date() }).where(eq(libraryLoans.id, loan.id));
        const [book] = await tx.select().from(libraryBooks).where(eq(libraryBooks.id, loan.bookId)).limit(1);
        const otherLoans = await tx.select({ id: libraryLoans.id }).from(libraryLoans).where(and(eq(libraryLoans.bookId, loan.bookId), or(eq(libraryLoans.status, "active"), eq(libraryLoans.status, "return_pending"))));
        if (book) await tx.update(libraryBooks).set({ status: otherLoans.length ? "lent" : "available" }).where(eq(libraryBooks.id, loan.bookId));
        return { success: true } as const;
      });
    }),
    lentBooks: adminProcedure.query(async () => {
      const db = dbOrError();
      const rows = await db.select({ loan: libraryLoans, book: libraryBooks, user: users }).from(libraryLoans).innerJoin(libraryBooks, eq(libraryLoans.bookId, libraryBooks.id)).innerJoin(users, eq(libraryLoans.userId, users.id)).where(eq(libraryLoans.status, "active")).orderBy(desc(libraryLoans.borrowedAt));
      return rows.map(({ loan, book, user }) => ({ ...loan, book, student: { id: user.studentId ?? user.username, name: user.name, email: user.email } }));
    }),
    decideBorrow: adminProcedure.input(z.object({ loanId: z.number().int().positive(), decision: z.enum(["approved", "declined"]) })).mutation(async ({ input }) => {
      const db = dbOrError();
      return db.transaction(async (tx) => {
        const [loan] = await tx.select().from(libraryLoans).where(eq(libraryLoans.id, input.loanId)).limit(1).for("update");
        if (!loan || loan.status !== "pending") throw new TRPCError({ code: "NOT_FOUND", message: "This borrow request is no longer pending." });
        const now = new Date();
        if (input.decision === "approved") {
          const [book] = await tx.select().from(libraryBooks).where(eq(libraryBooks.id, loan.bookId)).limit(1).for("update");
          if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "This book is no longer available." });
          const occupied = await tx.select({ id: libraryLoans.id }).from(libraryLoans).where(and(eq(libraryLoans.bookId, book.id), or(eq(libraryLoans.status, "active"), eq(libraryLoans.status, "return_pending"))));
          if (occupied.length >= book.totalCopies) throw new TRPCError({ code: "CONFLICT", message: "All copies are currently in use." });
          await tx.update(libraryLoans).set({ status: "active", borrowedAt: now, dueAt: new Date(now.getTime() + WEEK_MS) }).where(eq(libraryLoans.id, loan.id));
          await tx.update(libraryBooks).set({ status: occupied.length + 1 >= book.totalCopies ? "lent" : "available" }).where(eq(libraryBooks.id, loan.bookId));
        } else await tx.update(libraryLoans).set({ status: "declined" }).where(eq(libraryLoans.id, loan.id));
        return { success: true } as const;
      });
    }),
    requests: adminProcedure.query(async () => {
      const db = dbOrError();
      const rows = await db.select({ extension: libraryExtensions, loan: libraryLoans, book: libraryBooks, user: users })
        .from(libraryExtensions)
        .innerJoin(libraryLoans, eq(libraryExtensions.loanId, libraryLoans.id))
        .innerJoin(libraryBooks, eq(libraryLoans.bookId, libraryBooks.id))
        .innerJoin(users, eq(libraryExtensions.userId, users.id))
        .orderBy(desc(libraryExtensions.requestedAt));
      return rows.map(({ extension, loan, book, user }) => ({ ...extension, requestType: "extension" as const, loan, book, readerName: user.name ?? user.username ?? "Reader" }));
    }),

    addBook: adminProcedure.input(bookInput).mutation(async ({ input }) => {
      const db = dbOrError();
      const shelfRowRecords = await db.select({ shelfSlot: libraryBooks.shelfSlot, totalCopies: libraryBooks.totalCopies, title: libraryBooks.title, author: libraryBooks.author })
        .from(libraryBooks).where(and(eq(libraryBooks.shelf, input.shelf), eq(libraryBooks.shelfRow, input.shelfRow)));
      const matches = (book: { title: string; author: string }) => book.title.toLocaleLowerCase() === input.title.toLocaleLowerCase() && book.author.toLocaleLowerCase() === input.author.toLocaleLowerCase();
      const sameTitle = shelfRowRecords.filter(matches);
      const nextAfterSiblings = sameTitle.length ? Math.max(...sameTitle.map(book => book.shelfSlot + book.totalCopies)) : -1;
      let nextSlot = nextAfterSiblings;
      if (nextSlot < 0) {
        nextSlot = Array.from({ length: 41 - input.totalCopies }, (_, slot) => slot).find(slot => shelfRowRecords.every(book => slot + input.totalCopies <= book.shelfSlot || slot >= book.shelfSlot + book.totalCopies)) ?? 40;
      }
      if (nextSlot + input.totalCopies > 40) throw new TRPCError({ code: "CONFLICT", message: "That shelf row is full. Choose another shelf or row." });
      const [created] = await db.insert(libraryBooks).values({ ...input, shelfSlot: nextSlot, status: "available" }).returning({ id: libraryBooks.id });
      return { id: created.id, shelfSlot: nextSlot };
    }),

    removeBook: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const db = dbOrError();
      const [activeLoan] = await db.select({ id: libraryLoans.id }).from(libraryLoans).where(and(eq(libraryLoans.bookId, input.id), eq(libraryLoans.status, "active"))).limit(1);
      if (activeLoan) throw new TRPCError({ code: "CONFLICT", message: "Return the active loan before removing this book." });
      await db.delete(libraryBooks).where(eq(libraryBooks.id, input.id));
      return { success: true } as const;
    }),

    setStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.literal("available") })).mutation(async ({ input }) => {
      const db = dbOrError();
      return db.transaction(async (tx) => {
        const [book] = await tx.select().from(libraryBooks).where(eq(libraryBooks.id, input.id)).limit(1).for("update");
        if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "This book is no longer in the inventory." });
        const activeLoans = await tx.select({ id: libraryLoans.id }).from(libraryLoans)
          .where(and(eq(libraryLoans.bookId, input.id), eq(libraryLoans.status, "active")));
        if (activeLoans.length) {
          await tx.update(libraryLoans).set({ status: "returned", returnedAt: new Date() })
            .where(and(eq(libraryLoans.bookId, input.id), eq(libraryLoans.status, "active")));
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
