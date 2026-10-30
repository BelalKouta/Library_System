import { DEMO_COOKIE } from "./auth.js";
import { isSecureRequest, serializeCookie } from "./cookies.js";
import { libraryRouter } from "./routers/library.js";
import { publicProcedure, router } from "./trpc.js";

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) =>
      ctx.user ? { id: ctx.user.id, name: ctx.user.name, username: ctx.user.username, role: ctx.user.role } : null,
    ),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.resHeaders.append("Set-Cookie", serializeCookie(DEMO_COOKIE, "", { maxAgeSeconds: 0, secure: isSecureRequest(ctx.req) }));
      return { success: true } as const;
    }),
  }),
  library: libraryRouter,
});

export type AppRouter = typeof appRouter;
