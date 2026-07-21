CREATE TABLE IF NOT EXISTS public.job_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number TEXT NOT NULL,
    document_type TEXT NOT NULL,
    document_url TEXT NOT NULL,
    uploaded_by TEXT,
    uploaded_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_number, document_type)
);

CREATE INDEX IF NOT EXISTS idx_job_documents_job_number ON public.job_documents(job_number);
CREATE INDEX IF NOT EXISTS idx_job_documents_job_number_doc_type ON public.job_documents(job_number, document_type);
