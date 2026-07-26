-- 1. Extend profiles with photo, category-based permissions, and approval flag
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS photo TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS csc_role TEXT DEFAULT 'None',
  ADD COLUMN IF NOT EXISTS tracking_role TEXT DEFAULT 'None',
  ADD COLUMN IF NOT EXISTS unbilled_role TEXT DEFAULT 'None',
  ADD COLUMN IF NOT EXISTS branches TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS branch_user_role TEXT;

-- Auto-approve Super Admin Ganesaperumal
UPDATE public.profiles 
SET is_approved = TRUE, 
    role = 'Admin',
    csc_role = 'Admin', 
    tracking_role = 'Admin', 
    unbilled_role = 'Admin', 
    branches = '{"ALL"}'
WHERE username = 'ganesh' OR name ILIKE '%Ganesaperumal%' OR role = 'Admin';

-- 2. Performance Indexes for Speed Optimization
CREATE INDEX IF NOT EXISTS idx_jobs_branch ON public.jobs(branch);
CREATE INDEX IF NOT EXISTS idx_jobs_goods_track_status ON public.jobs(goods_track_status);
CREATE INDEX IF NOT EXISTS idx_jobs_po_status ON public.jobs(po_status);
CREATE INDEX IF NOT EXISTS idx_legacy_jobs_branch ON public.legacy_jobs(branch);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);

-- 3. Add Standardized Tracking fields to main jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS po_status TEXT,
  ADD COLUMN IF NOT EXISTS po_date DATE,
  ADD COLUMN IF NOT EXISTS inv_request_date DATE,
  ADD COLUMN IF NOT EXISTS bill_closure_date DATE,
  ADD COLUMN IF NOT EXISTS sales_by TEXT;

-- 4. Minimal Enquiry Values Table
CREATE TABLE IF NOT EXISTS public.enquiry_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enquiry_number TEXT UNIQUE NOT NULL,
    quote_value NUMERIC(12, 2),
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enquiry_values_enquiry_number ON public.enquiry_values(enquiry_number);

-- 5. Aligned Legacy Jobs Table
CREATE TABLE IF NOT EXISTS public.legacy_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number TEXT NOT NULL,
    enquiry_number TEXT,
    branch TEXT NOT NULL,
    customer_name TEXT,
    company TEXT,
    packing_date DATE,
    delivery_date DATE,
    goods_track_status TEXT,
    po_status TEXT,
    po_date DATE,
    inv_request_date DATE,
    bill_closure_date DATE,
    sales_by TEXT,
    spoc_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Daily Unbilled Follow-up Notes Table
CREATE TABLE IF NOT EXISTS public.unbilled_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id SERIAL,
    job_id UUID,
    job_number TEXT NOT NULL,
    updated_by UUID REFERENCES public.profiles(id),
    agent_name TEXT NOT NULL,
    followup_notes TEXT NOT NULL,
    next_followup_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unbilled_followups_job_number ON public.unbilled_followups(job_number);

-- 7. Add Sequential Display IDs (1, 2, 3...) across tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id SERIAL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.unbilled_followups ADD COLUMN IF NOT EXISTS display_id SERIAL;
ALTER TABLE public.enquiry_values ADD COLUMN IF NOT EXISTS display_id SERIAL;
ALTER TABLE public.legacy_jobs ADD COLUMN IF NOT EXISTS display_id SERIAL;

