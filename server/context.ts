import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "../db/schema.js";
import { DEMO_COOKIE, resolveDemoSession } from "./auth.js";
import { parseCookies } from "./cookies.js";

export type TrpcContext = {
  req: Request;
  /** Headers added here (e.g. Set-Cookie) are sent with the tRPC response. */
  resHeaders: Headers;
  user: User | null;
};

export async function createContext({ req, resHeaders }: FetchCreateContextFnOptions): Promise<TrpcContext> {
  const token = parseCookies(req.headers.get("cookie"))[DEMO_COOKIE];
  const user = token ? await resolveDemoSession(token) : null;
  return { req, resHeaders, user };
}
