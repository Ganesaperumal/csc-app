-- Create job_communications table for structured communication logging
CREATE TABLE IF NOT EXISTS job_communications (
  id BIGSERIAL PRIMARY KEY,
  job_number TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('Customer', 'Internal')),
  regarding TEXT NOT NULL CHECK (regarding IN (
    'Pre-Packing', 'Packing', 'In Transit', 'Delivery',
    'Feedback', 'Damages', 'Complaints', 'Billing', 'Storage'
  )),
  contact_person TEXT,
  contact_number TEXT,
  summary TEXT NOT NULL,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast job-based lookups
CREATE INDEX IF NOT EXISTS idx_job_communications_job_number ON job_communications(job_number);

-- Index for filtering by call type or regarding
CREATE INDEX IF NOT EXISTS idx_job_communications_call_type ON job_communications(call_type);
CREATE INDEX IF NOT EXISTS idx_job_communications_regarding ON job_communications(regarding);
