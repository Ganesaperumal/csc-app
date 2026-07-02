-- 1. Rename existing job_logs table to job_notes
ALTER TABLE IF EXISTS public.job_logs RENAME TO job_notes;

-- (Optional) If you want to drop the log_type column since it's only notes now:
-- ALTER TABLE public.job_notes DROP COLUMN IF EXISTS log_type;

-- 2. Create the new job_shipment_track table
CREATE TABLE IF NOT EXISTS public.job_shipment_track (
  id BIGSERIAL PRIMARY KEY,
  job_number TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  date DATE,
  location TEXT,
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast job-based lookups
CREATE INDEX IF NOT EXISTS idx_job_shipment_track_job_number ON public.job_shipment_track(job_number);

-- ============================================================================
-- RLS OPTIONS
-- ============================================================================
-- OPTION A: WITH RLS (Recommended)
-- ALTER TABLE public.job_notes ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow authenticated read" ON public.job_notes FOR SELECT USING (auth.role() = 'authenticated');
-- CREATE POLICY "Allow authenticated insert" ON public.job_notes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
--
-- ALTER TABLE public.job_shipment_track ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow authenticated read" ON public.job_shipment_track FOR SELECT USING (auth.role() = 'authenticated');
-- CREATE POLICY "Allow authenticated insert" ON public.job_shipment_track FOR INSERT WITH CHECK (auth.role() = 'authenticated');
--
-- OPTION B: WITHOUT RLS
-- ALTER TABLE public.job_notes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.job_shipment_track DISABLE ROW LEVEL SECURITY;
