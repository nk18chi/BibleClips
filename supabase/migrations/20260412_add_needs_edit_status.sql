-- Add NEEDS_EDIT to the clips status check constraint
ALTER TABLE clips DROP CONSTRAINT IF EXISTS clips_status_check;
ALTER TABLE clips ADD CONSTRAINT clips_status_check CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_EDIT'));
