-- Change clip start_time and end_time from INTEGER to DECIMAL for millisecond precision
ALTER TABLE clips
  ALTER COLUMN start_time TYPE DECIMAL(10,3) USING start_time::DECIMAL(10,3),
  ALTER COLUMN end_time TYPE DECIMAL(10,3) USING end_time::DECIMAL(10,3);
