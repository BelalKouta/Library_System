# Deploying Shelfwalk: Supabase + Vercel

You need free accounts on **GitHub**, **Supabase** and **Vercel**. Total time: about 15 minutes.

## 1. Create the database (Supabase)

1. Go to https://supabase.com → **New project**. Pick a name and region near your users, and set a **database password**. Save it somewhere safe; you need it in step 3.
2. Wait for the project to finish provisioning.
3. Open **SQL Editor → New query**. Paste the full contents of `supabase/schema.sql` → **Run**. You should see "Success. No rows returned".
4. Open another **New query**. Paste `supabase/seed.sql` → **Run**.
5. Open **Table Editor** and check: `library_books` has **18** rows and `users` has **2** rows (`admin`, `reader`).

## 2. Get the connection string

1. In Supabase click **Connect** (top bar) → **Connection string** → **Transaction pooler**. It uses **port 6543** and looks like:
   `postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
2. Replace `[YOUR-PASSWORD]` with your database password (remove the square brackets). If the password contains characters like `@ : / # ?`, URL-encode them (`@` → `%40`).
3. Use the **Transaction pooler** string, not the "Direct connection". Vercel can't reach the direct host over IPv4, and serverless functions need pooling.

## 3. Push the code to GitHub

```bash
cd shelfwalk
pnpm install                 # creates pnpm-lock.yaml (commit it!)
pnpm check && pnpm test      # optional but recommended
git init
git add .
git commit -m "Shelfwalk for Supabase + Vercel"
# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/shelfwalk.git
git branch -M main
git push -u origin main
```
`.env.local` is git-ignored, so your secrets are not pushed.

## 4. Deploy on Vercel

1. https://vercel.com/new → **Import** your GitHub repo.
2. Framework Preset should show **Vite**. Leave build settings as they are (`vercel.json` already sets them).
3. Open **Environment Variables** and add (for Production, Preview and Development):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Transaction-pooler string from step 2 |
   | `SESSION_SECRET` | a long random string. Generate one: `openssl rand -base64 48` |

4. Click **Deploy**.

## 5. Check it works

1. Open `https://<your-project>.vercel.app/api/health`. Expected:
   `{"status":"ok","database":"connected","sessionSecret":true}`
2. Open the site → **Sign in** → create a student account → **Browse books** → request a title → have the librarian approve it → **My loans**.
3. Sign out, sign in as Librarian → **Librarian** → approve the extension.
4. Refresh on `/library` and `/loans`; they should load (not 404).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `/api/health` → `"database":"not-configured"` | `DATABASE_URL` is missing. Add it in Vercel, then **Redeploy** (env changes only apply to new deployments). |
| `"database":"unreachable"` | Wrong password, or you used the Direct connection. Re-copy the **Transaction pooler** string. Check Vercel → Logs. |
| `"sessionSecret":false` | `SESSION_SECRET` is missing or shorter than 16 characters. |
| Account access says "credentials did not match" | `seed.sql` didn't run. Check the `users` table has `admin` and `reader`. |
| Sign-in works then logs out immediately | `SESSION_SECRET` changed between deployments; sign in again. |
| Build fails at install | Make sure `pnpm-lock.yaml` is committed, or keep the `installCommand` in `vercel.json`. |
| 3D room is blank on a phone | Test on a real device; WebGL is required. The Browse books page works without it. |

## Resetting the library data

In the SQL Editor:
```sql
truncate public.library_extensions, public.library_loans, public.library_books restart identity cascade;
```
then re-run `supabase/seed.sql`.
