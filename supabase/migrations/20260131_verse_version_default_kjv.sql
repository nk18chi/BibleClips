-- Change default version from NIV to KJV (NIV is copyrighted and not in our bible-api)
ALTER TABLE clip_verses ALTER COLUMN version SET DEFAULT 'KJV';
UPDATE clip_verses SET version = 'KJV' WHERE version = 'NIV';
