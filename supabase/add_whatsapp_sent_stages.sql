-- Add whatsapp_sent_stages column to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS whatsapp_sent_stages JSONB DEFAULT '{}'::jsonb;
