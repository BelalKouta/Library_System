-- Apply this once to an existing Shelfwalk database before deploying the new app.
-- Fresh databases should use schema.sql instead.
ALTER TYPE public.loan_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.loan_status ADD VALUE IF NOT EXISTS 'declined';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS student_id varchar(32);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email varchar(320);
UPDATE public.users SET email = COALESCE(email, CONCAT(COALESCE(username, 'legacy'), '@invalid.local')) WHERE email IS NULL;
ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;
ALTER TABLE public.users ALTER COLUMN password_hash TYPE varchar(200);
CREATE UNIQUE INDEX IF NOT EXISTS users_student_id_unique ON public.users (student_id) WHERE student_id IS NOT NULL;
DO $$ BEGIN
  ALTER TABLE public.users ADD CONSTRAINT users_student_id_format CHECK (student_id IS NULL OR student_id ~ '^[0-9]{2}-[0-9]{6}$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
