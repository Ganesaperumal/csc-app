-- Migration: Make job_number the primary key of legacy_jobs (like jobs table)
-- Run this in Supabase SQL Editor

-- Step 1: Drop the old UUID primary key
ALTER TABLE public.legacy_jobs DROP CONSTRAINT IF EXISTS legacy_jobs_pkey;

-- Step 2: Drop the UUID id column
ALTER TABLE public.legacy_jobs DROP COLUMN IF EXISTS id;

-- Step 3: Drop display_id serial column (no longer needed as id)
-- (keep it if you use it elsewhere, comment this out if needed)
-- ALTER TABLE public.legacy_jobs DROP COLUMN IF EXISTS display_id;

-- Step 4: Make job_number the primary key
ALTER TABLE public.legacy_jobs ADD PRIMARY KEY (job_number);

-- Step 5: Add unique constraint explicitly (already enforced by PK, just for clarity)
-- Already covered by PRIMARY KEY, so skip.

-- Confirm:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'legacy_jobs';
