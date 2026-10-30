# Shelfwalk — University Library

A walkable Three.js reading room, a searchable catalogue, lending/return flows, extension requests, and a librarian inventory desk.

**Stack:** React 19 + Vite · tRPC 11 (Vercel serverless function) · Drizzle ORM · Supabase Postgres · Three.js

> To publish it, follow **[DEPLOY.md](./DEPLOY.md)** (Supabase → GitHub → Vercel).

## Local development

```bash
pnpm install
cp .env.example .env.local     # then fill in DATABASE_URL and SESSION_SECRET
pnpm dev                       # http://localhost:3000  (UI + API in one process)
```

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server; `/api/*` is served by the same handlers Vercel runs |
| `pnpm check` | TypeScript check |
| `pnpm test` | Unit tests (password hashes, cookies) |
| `pnpm build` | Production build into `dist/` |

## Project layout

- `client/src/` — pages (`Home`, `Library` 3D room, `BrowseBooks`, `Loans`, `Admin`) and components
- `client/public/` — static files, hero photo, standalone `browse-books.html` filmography
- `api/` — Vercel serverless entry points (`/api/trpc/*`, `/api/health`)
- `server/` — tRPC routers, auth (signed session cookie), database connection
- `db/schema.ts` — Drizzle schema; mirrors `supabase/schema.sql`
- `supabase/schema.sql`, `supabase/seed.sql` — run these in the Supabase SQL Editor

## Demo sign-in

| Role | Username | Password |
|---|---|---|
| Librarian | `admin` | `Shelfwalk2026!` |
| Reader | `reader` | `Reader2026!` |

These are **public, project-demo credentials** for fictional users. Anyone who finds your deployed URL can sign in as librarian and edit the catalogue. For anything beyond a class demo, replace the demo sign-in with real authentication (e.g. Supabase Auth) or change the passwords by regenerating the hashes in `supabase/seed.sql`.

## Rules for editing server code

Vercel runs files in `api/` as native ES modules, so **relative imports in `api/`, `server/` and `db/` must end in `.js`** (e.g. `import { x } from "./auth.js"` even though the file is `auth.ts`). Don't use the `@/` alias there.

If you change `db/schema.ts`, make the same change in `supabase/schema.sql` (and write a new SQL migration for existing data).
