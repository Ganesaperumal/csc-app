-- =============================================================================
-- AUDIT LOGS MIGRATION
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Step 1: Rename job_logs to audit_logs (if the old table still exists)
ALTER TABLE IF EXISTS public.job_logs RENAME TO audit_logs;

-- Step 2: If audit_logs already existed fresh (no rename happened), create it
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  job_number  TEXT        NOT NULL DEFAULT '',
  name        TEXT,
  username    TEXT,
  field_change TEXT,
  old_value   TEXT,
  new_value   TEXT,
  timestamp   TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Drop obsolete columns from the old schema (safe — IF EXISTS)
ALTER TABLE public.audit_logs
  DROP COLUMN IF EXISTS action,
  DROP COLUMN IF EXISTS changes,
  DROP COLUMN IF EXISTS job_id,
  DROP COLUMN IF EXISTS agent_name,
  DROP COLUMN IF EXISTS log_type,
  DROP COLUMN IF EXISTS message,
  DROP COLUMN IF EXISTS created_at;

-- Step 4: Add new columns if they don't exist yet (idempotent)
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS name         TEXT,
  ADD COLUMN IF NOT EXISTS username     TEXT,
  ADD COLUMN IF NOT EXISTS field_change TEXT,
  ADD COLUMN IF NOT EXISTS old_value    TEXT,
  ADD COLUMN IF NOT EXISTS new_value    TEXT,
  ADD COLUMN IF NOT EXISTS timestamp    TIMESTAMPTZ DEFAULT NOW();

-- Step 5: Performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_job_number ON public.audit_logs(job_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp  ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username   ON public.audit_logs(username);

-- Step 6: RLS — authenticated users can read and insert
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_read"   ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

CREATE POLICY "audit_logs_read"
  ON public.audit_logs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "audit_logs_insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
