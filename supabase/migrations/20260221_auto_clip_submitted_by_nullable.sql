-- Allow auto-generated clips with no submitting user
ALTER TABLE clips ALTER COLUMN submitted_by DROP NOT NULL;
