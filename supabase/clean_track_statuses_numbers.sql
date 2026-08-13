-- Migration script to remove leading stage numbers from Goods Track and Car Track statuses
-- Table: jobs
UPDATE jobs 
SET goods_track_status = REGEXP_REPLACE(goods_track_status, '^\d+\.\s*', '')
WHERE goods_track_status ~ '^\d+\.';

UPDATE jobs 
SET car_track_status = REGEXP_REPLACE(car_track_status, '^\d+\.\s*', '')
WHERE car_track_status ~ '^\d+\.';

-- Table: legacy_jobs
UPDATE legacy_jobs 
SET goods_track_status = REGEXP_REPLACE(goods_track_status, '^\d+\.\s*', '')
WHERE goods_track_status ~ '^\d+\.';
