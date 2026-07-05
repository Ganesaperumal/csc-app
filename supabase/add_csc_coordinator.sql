-- Add csc_coordinator column to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS csc_coordinator TEXT;
