-- Add deleted_at column to options table for soft delete
ALTER TABLE options
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for performance on soft deleted queries
CREATE INDEX IF NOT EXISTS options_deleted_at_idx ON options(deleted_at);

-- Update existing queries to filter soft deleted options
-- The application layer will handle filtering via .is('deleted_at', null)

-- Ensure cascade delete from option_groups still works
-- (CASCADE behavior is already defined in the original table creation)

