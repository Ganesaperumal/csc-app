CREATE TABLE IF NOT EXISTS public.job_pods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number TEXT NOT NULL,
    filename TEXT NOT NULL,
    r2_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    version INT DEFAULT 1,
    status TEXT DEFAULT 'active', -- active, archived
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by job_number
CREATE INDEX IF NOT EXISTS idx_job_pods_job_number ON public.job_pods(job_number);
