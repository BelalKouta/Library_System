// Drizzle mirror of supabase/schema.sql. If you change one, change the other.
import { check, index, integer, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const bookStatus = pgEnum("book_status", ["available", "lent"]);
export const loanStatus = pgEnum("loan_status", ["pending", "active", "return_pending", "returned", "declined"]);
export const extensionStatus = pgEnum("extension_status", ["pending", "approved", "declined"]);

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

/** Application identity table for students and fixed librarian accounts. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 40 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull(),
  studentId: varchar("student_id", { length: 32 }).unique(),
  loginMethod: varchar("login_method", { length: 64 }),
  passwordHash: varchar("password_hash", { length: 200 }),
  role: userRole("role").default("user").notNull(),
  createdAt: ts("created_at").defaultNow().notNull(),
  updatedAt: ts("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignedIn: ts("last_signed_in").defaultNow().notNull(),
}, (t) => [check("users_student_id_format", sql`${t.studentId} IS NULL OR ${t.studentId} ~ '^[0-9]{2}-[0-9]{6}$'`)]);

export const libraryBooks = pgTable("library_books", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 240 }).notNull(),
  author: varchar("author", { length: 180 }).notNull(),
  category: varchar("category", { length: 80 }).notNull().default("General"),
  isbn: varchar("isbn", { length: 32 }),
  description: text("description"),
  callNumber: varchar("call_number", { length: 48 }).notNull(),
  shelf: varchar("shelf", { length: 24 }).notNull(),
  shelfRow: integer("shelf_row").notNull().default(0),
  shelfSlot: integer("shelf_slot").notNull().default(0),
  coverColor: varchar("cover_color", { length: 16 }).notNull().default("#234663"),
  accentColor: varchar("accent_color", { length: 16 }).notNull().default("#C9B68A"),
  status: bookStatus("status").notNull().default("available"),
  totalCopies: integer("total_copies").notNull().default(1),
  createdAt: ts("created_at").defaultNow().notNull(),
  updatedAt: ts("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [index("library_books_shelf_position").on(t.shelfRow, t.shelfSlot)]);

export const libraryLoans = pgTable("library_loans", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => libraryBooks.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  borrowedAt: ts("borrowed_at").notNull(),
  dueAt: ts("due_at").notNull(),
  returnedAt: ts("returned_at"),
  status: loanStatus("status").notNull().default("active"),
  createdAt: ts("created_at").defaultNow().notNull(),
}, (t) => [
  index("library_loans_book_status").on(t.bookId, t.status),
  index("library_loans_user_status").on(t.userId, t.status),
]);

export const libraryExtensions = pgTable("library_extensions", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull().references(() => libraryLoans.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: extensionStatus("status").notNull().default("pending"),
  requestedAt: ts("requested_at").defaultNow().notNull(),
  resolvedAt: ts("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id, { onDelete: "set null" }),
}, (t) => [
  uniqueIndex("library_extensions_loan_unique").on(t.loanId),
  index("library_extensions_status").on(t.status),
]);

export type User = typeof users.$inferSelect;
export type LibraryBook = typeof libraryBooks.$inferSelect;
export type LibraryLoan = typeof libraryLoans.$inferSelect;
export type LibraryExtension = typeof libraryExtensions.$inferSelect;
