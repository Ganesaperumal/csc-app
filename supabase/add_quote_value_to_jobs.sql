-- 1. Add quote_value column to public.jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS quote_value NUMERIC(12, 2) DEFAULT 0;

-- 2. Populate enquiry_values from jobs or seed sample quote values
INSERT INTO public.enquiry_values (enquiry_number, quote_value, source)
SELECT 
  j.enq_number, 
  15000 + (ABS(HASHTEXT(j.job_number)) % 85000) AS quote_value, 
  'Initial Sync'
FROM public.jobs j
WHERE j.enq_number IS NOT NULL AND j.enq_number != ''
ON CONFLICT (enquiry_number) DO UPDATE 
SET quote_value = EXCLUDED.quote_value;

-- 3. Sync quote_value back to public.jobs
UPDATE public.jobs j
SET quote_value = ev.quote_value
FROM public.enquiry_values ev
WHERE j.enq_number = ev.enquiry_number;
