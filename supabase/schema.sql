-- Shelfwalk schema for Supabase (Postgres).
-- Paste this whole file into: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run: every statement is guarded.

-- ---------- Enums ----------
do $$ begin create type public.user_role        as enum ('user', 'admin');                      exception when duplicate_object then null; end $$;
do $$ begin create type public.book_status      as enum ('available', 'lent');                  exception when duplicate_object then null; end $$;
do $$ begin create type public.loan_status      as enum ('active', 'returned');                 exception when duplicate_object then null; end $$;
do $$ begin create type public.extension_status as enum ('pending', 'approved', 'declined');    exception when duplicate_object then null; end $$;

-- ---------- Tables ----------
create table if not exists public.users (
  id             serial primary key,
  username       varchar(40) unique,
  name           text,
  email          varchar(320),
  login_method   varchar(64),
  password_hash  varchar(160),
  role           public.user_role not null default 'user',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  last_signed_in timestamptz not null default now()
);

create table if not exists public.library_books (
  id           serial primary key,
  title        varchar(240) not null,
  author       varchar(180) not null,
  category     varchar(80)  not null default 'General',
  isbn         varchar(32),
  description  text,
  call_number  varchar(48)  not null,
  shelf        varchar(24)  not null,
  shelf_row    integer      not null default 0,
  shelf_slot   integer      not null default 0,
  cover_color  varchar(16)  not null default '#234663',
  accent_color varchar(16)  not null default '#C9B68A',
  status       public.book_status not null default 'available',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists library_books_shelf_position on public.library_books (shelf_row, shelf_slot);

create table if not exists public.library_loans (
  id          serial primary key,
  book_id     integer not null references public.library_books(id) on delete cascade,
  user_id     integer not null references public.users(id)         on delete cascade,
  borrowed_at timestamptz not null,
  due_at      timestamptz not null,
  returned_at timestamptz,
  status      public.loan_status not null default 'active',
  created_at  timestamptz not null default now()
);
create index if not exists library_loans_book_status on public.library_loans (book_id, status);
create index if not exists library_loans_user_status on public.library_loans (user_id, status);
-- Database-level guarantee: a book can never have two active loans at once.
create unique index if not exists library_loans_one_active_per_book
  on public.library_loans (book_id) where status = 'active';

create table if not exists public.library_extensions (
  id           serial primary key,
  loan_id      integer not null references public.library_loans(id) on delete cascade,
  user_id      integer not null references public.users(id)         on delete cascade,
  status       public.extension_status not null default 'pending',
  requested_at timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  integer references public.users(id) on delete set null
);
create unique index if not exists library_extensions_loan_unique on public.library_extensions (loan_id);
create index if not exists library_extensions_status on public.library_extensions (status);

-- ---------- Security ----------
-- Supabase exposes every table in the public schema through its REST API using the
-- public "anon" key. Shelfwalk never uses that API: the app talks to Postgres directly
-- from its server functions. Turning on Row Level Security with NO policies blocks all
-- access through the public API (this protects the demo password hashes), while the
-- server's direct database connection keeps working.
alter table public.users              enable row level security;
alter table public.library_books      enable row level security;
alter table public.library_loans      enable row level security;
alter table public.library_extensions enable row level security;
