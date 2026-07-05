-- Create whatsapp_logs table to log details of sent WhatsApp messages
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id BIGSERIAL PRIMARY KEY,
  job_number TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  message_text TEXT NOT NULL
);

-- Index for fast lookup by job_number
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_job_number ON public.whatsapp_logs(job_number);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated read access
CREATE POLICY "Allow authenticated read" 
  ON public.whatsapp_logs FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Allow authenticated insert access
CREATE POLICY "Allow authenticated insert" 
  ON public.whatsapp_logs FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
