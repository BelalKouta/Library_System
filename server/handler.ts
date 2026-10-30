import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { sql } from "drizzle-orm";
import { createContext } from "./context.js";
import { getDb } from "./db.js";
import { appRouter } from "./routers.js";

/** Shared by the Vercel function (api/trpc/[trpc].ts) and the local Vite dev middleware. */
export function handleTrpc(req: Request): Promise<Response> {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError({ error, path }) {
      if (error.code === "INTERNAL_SERVER_ERROR") console.error(`[tRPC] ${path ?? "?"} failed:`, error);
    },
  });
}

/** GET /api/health: quick deployment check. Reveals only yes/no flags, never secrets. */
export async function handleHealth(): Promise<Response> {
  let database: "connected" | "unreachable" | "not-configured" = "not-configured";
  const db = getDb();
  if (db) {
    try { await db.execute(sql`select 1`); database = "connected"; } catch (error) { console.error("[health] database check failed:", error); database = "unreachable"; }
  }
  const sessionSecret = Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16);
  const ok = database === "connected" && sessionSecret;
  return Response.json({ status: ok ? "ok" : "degraded", database, sessionSecret }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
