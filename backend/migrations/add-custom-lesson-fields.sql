-- Add custom fields to completed_lessons table for weekly customizations
-- This allows overriding lesson type, price, and student name for specific weeks

ALTER TABLE completed_lessons
ADD COLUMN IF NOT EXISTS "customPrice" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "customStudentName" TEXT,
ADD COLUMN IF NOT EXISTS "customLessonTypeId" TEXT;

-- Add foreign key constraint for custom lesson type
ALTER TABLE completed_lessons
ADD CONSTRAINT "completed_lessons_customLessonTypeId_fkey"
FOREIGN KEY ("customLessonTypeId")
REFERENCES lesson_types(id)
ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "completed_lessons_customLessonTypeId_idx"
ON completed_lessons("customLessonTypeId");
