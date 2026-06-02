-- Migration: Add color column to teacher_schedules table
-- This allows teachers to set custom colors for schedule cells

-- Add color column with default value
ALTER TABLE teacher_schedules
ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#FFD700';

-- Add comment
COMMENT ON COLUMN teacher_schedules.color IS 'Background color for the schedule cell (hex format)';
