-- Add spoc_access column to profiles for SPOC Master page access control
-- Values: 'None' | 'View' | 'Edit'

alter table public.profiles
  add column if not exists spoc_access text default 'None';
