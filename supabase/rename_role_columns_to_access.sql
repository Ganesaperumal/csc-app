-- Rename access columns in public.profiles table from *_role to *_access
ALTER TABLE public.profiles RENAME COLUMN csc_role TO csc_access;
ALTER TABLE public.profiles RENAME COLUMN followups_role TO followups_access;
ALTER TABLE public.profiles RENAME COLUMN all_jobs_role TO all_jobs_access;
ALTER TABLE public.profiles RENAME COLUMN unbilled_role TO unbilled_access;

-- Add role & department if not present
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'User';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
