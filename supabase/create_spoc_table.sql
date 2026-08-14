-- SPOC Master Table
-- Maps companies (or PRIVATE branch rules) to Sales SPOC and Unbilled SPOC

create table if not exists public.spoc (
  id            bigserial primary key,
  company_name  text not null,             -- 'UltraTech Cements' or 'PRIVATE'
  aliases       text[] default '{}',       -- ['UltraTech','ultratech cement'] for fuzzy fallback
  branch        text default null,         -- NULL = all branches; 'MAA','DEL' etc. for PRIVATE rules
  sales_spoc    text default null,         -- maps to jobs.sales_by
  unbilled_spoc text default null,         -- maps to jobs.spoc_name
  is_private_rule boolean default false,   -- true for PRIVATE+branch rules
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Enable RLS
alter table public.spoc enable row level security;

-- Drop existing policies if any
drop policy if exists "spoc_read_authenticated" on public.spoc;
drop policy if exists "spoc_write_service" on public.spoc;
drop policy if exists "spoc_all_authenticated" on public.spoc;

-- Allow authenticated users to perform all operations
create policy "spoc_all_authenticated" on public.spoc
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
