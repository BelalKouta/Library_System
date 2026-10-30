import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";

const ROOT = import.meta.dirname;

/**
 * Local development only: serves /api/* through the same handlers Vercel runs in production,
 * so `pnpm dev` is a single command. Reads DATABASE_URL / SESSION_SECRET from .env.local or .env.
 */
function shelfwalkApiDev(): Plugin {
  return {
    name: "shelfwalk-api-dev",
    apply: "serve",
    configureServer(server) {
      const env = loadEnv("development", ROOT, "");
      for (const [key, value] of Object.entries(env)) if (process.env[key] === undefined) process.env[key] = value;

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        try {
          const mod = await server.ssrLoadModule(path.resolve(ROOT, "server/handler.ts"));
          const method = req.method ?? "GET";
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = Buffer.concat(chunks);
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
            else if (value !== undefined) headers.set(key, value);
          }
          const request = new Request(`http://${req.headers.host ?? "localhost:3000"}${req.url}`, {
            method,
            headers,
            body: method === "GET" || method === "HEAD" || body.length === 0 ? undefined : body,
          });
          const pathname = new URL(request.url).pathname;
          const response: Response = pathname.startsWith("/api/trpc")
            ? await mod.handleTrpc(request)
            : pathname === "/api/health"
              ? await mod.handleHealth()
              : new Response("Not found", { status: 404 });
          res.statusCode = response.status;
          response.headers.forEach((value, key) => { if (key !== "set-cookie") res.setHeader(key, value); });
          const cookies = response.headers.getSetCookie();
          if (cookies.length) res.setHeader("set-cookie", cookies);
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          server.ssrFixStacktrace(error as Error);
          console.error("[api-dev]", error);
          res.statusCode = 500;
          res.end("API error");
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), shelfwalkApiDev()],
  resolve: {
    alias: {
      "@": path.resolve(ROOT, "client", "src"),
    },
  },
  envDir: ROOT,
  root: path.resolve(ROOT, "client"),
  publicDir: path.resolve(ROOT, "client", "public"),
  build: {
    outDir: path.resolve(ROOT, "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
  },
  server: {
    host: true,
    port: 3000,
    fs: { strict: true, deny: ["**/.*"] },
  },
});
