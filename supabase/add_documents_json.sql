ALTER TABLE public.jobs DROP COLUMN IF EXISTS pod_url;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS pod_uploaded_on;
ALTER TABLE public.jobs ADD COLUMN IF EXISTS documents JSONB DEFAULT '[]'::jsonb;
