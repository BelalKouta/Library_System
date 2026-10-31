ALTER TABLE public.library_books ADD COLUMN IF NOT EXISTS total_copies integer NOT NULL DEFAULT 1 CHECK (total_copies >= 1);
ALTER TYPE public.loan_status ADD VALUE IF NOT EXISTS 'return_pending';
DROP INDEX IF EXISTS public.library_loans_one_active_per_book;
