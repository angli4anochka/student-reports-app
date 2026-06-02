-- Add lessonPlan and time fields to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_plan TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS time VARCHAR(255);
