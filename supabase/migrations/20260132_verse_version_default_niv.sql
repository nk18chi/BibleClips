-- Revert default to NIV (most popular version, supported by BibleGateway)
ALTER TABLE clip_verses ALTER COLUMN version SET DEFAULT 'NIV';
UPDATE clip_verses SET version = 'NIV' WHERE version = 'KJV';
