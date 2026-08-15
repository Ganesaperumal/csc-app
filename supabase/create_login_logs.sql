-- 1. Create login_logs table for audit trail of user access
CREATE TABLE IF NOT EXISTS public.login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    username TEXT NOT NULL,
    name TEXT,
    role TEXT,
    department TEXT,
    branch TEXT,
    ip_address TEXT,
    user_agent TEXT,
    device TEXT,
    browser TEXT,
    os TEXT,
    status TEXT NOT NULL DEFAULT 'success', -- 'success' | 'failed' | 'deactivated'
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for quick search and date-range queries
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON public.login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_username ON public.login_logs(username);
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON public.login_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_status ON public.login_logs(status);

-- 2. Create usage_logs table for tracking heavy egress and data operations (exports, bulk syncs, large queries)
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    username TEXT,
    action_type TEXT NOT NULL, -- 'csv_export' | 'sheets_export' | 'erp_sync' | 'bulk_query'
    resource TEXT,             -- e.g. 'all_jobs', 'unbilled', 'legacy_jobs'
    row_count INT DEFAULT 0,
    estimated_bytes BIGINT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON public.usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_action_type ON public.usage_logs(action_type);

-- 3. Add last_login_at column to profiles for quick viewing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_ip TEXT;

-- Enable Row Level Security (RLS)
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view logs if they are super admin, or allow service role full access
CREATE POLICY "Super Admins can view login logs" ON public.login_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
        )
    );

CREATE POLICY "Super Admins can view usage logs" ON public.usage_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
        )
    );
