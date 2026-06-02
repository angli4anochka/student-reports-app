-- Add lesson reminder fields to lessons table
-- This migration adds the missing fields needed for lesson reminders feature

-- Add lesson_plan field (structure of the lesson with reminders)
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_plan TEXT;

-- Add time field (lesson start time in HH:MM format)
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS time VARCHAR(255);

-- Add notification_date field (date for notifications in DD.MM format)
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS notification_date VARCHAR(255);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'lessons'
  AND column_name IN ('lesson_plan', 'time', 'notification_date')
ORDER BY column_name;
