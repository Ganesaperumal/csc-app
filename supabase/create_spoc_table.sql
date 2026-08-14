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

-- Authenticated users can read
create policy "spoc_read_authenticated" on public.spoc
  for select using (auth.role() = 'authenticated');

-- Service role can do everything (used by sync-spocs API route)
create policy "spoc_write_service" on public.spoc
  for all using (true) with check (true);
