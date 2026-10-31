import { jwtVerify, SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { users, type User } from "../db/schema.js";
import { getDb } from "./db.js";

export const SESSION_COOKIE = "shelfwalk_session";
export const SESSION_SECONDS = 8 * 60 * 60;

function sessionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET is missing or too short (use at least 32 random characters).");
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: number): Promise<string> {
  return new SignJWT({ purpose: "shelfwalk-session", userId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(sessionKey());
}

export async function resolveSession(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { algorithms: ["HS256"] });
    if (payload.purpose !== "shelfwalk-session" || typeof payload.userId !== "number") return null;
    const db = getDb();
    if (!db) return null;
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    return user ?? null;
  } catch {
    return null;
  }
}
