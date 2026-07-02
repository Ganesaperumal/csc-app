-- Add a column to track if a follow-up has been completed
ALTER TABLE public.job_communications 
ADD COLUMN IF NOT EXISTS follow_up_completed BOOLEAN DEFAULT FALSE;
