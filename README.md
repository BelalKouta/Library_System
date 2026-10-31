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
- `client/public/` — static files, hero photo, static library artwork
- `api/` — Vercel serverless entry points (`/api/trpc/*`, `/api/health`)
- `server/` — tRPC routers, auth (signed session cookie), database connection
- `db/schema.ts` — Drizzle schema; mirrors `supabase/schema.sql`
- `supabase/schema.sql`, `supabase/seed.sql` — run these in the Supabase SQL Editor

## Account access
Students create accounts with their name, numeric EUI student ID, password, and an automatically generated `@students.eui.edu.eg` email. Librarian accounts are fixed staff records in the database and are not exposed as public credentials.
