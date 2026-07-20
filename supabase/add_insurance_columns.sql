ALTER TABLE jobs
ADD COLUMN insurance BOOLEAN DEFAULT false,
ADD COLUMN insurance_value TEXT;
