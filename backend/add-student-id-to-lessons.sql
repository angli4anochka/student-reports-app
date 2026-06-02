-- Add student_id field to lessons table for individual student lessons
-- This allows lessons without a group to be associated with a specific student

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;

-- Create index for faster lookups by student
CREATE INDEX IF NOT EXISTS lessons_student_id_idx ON lessons(student_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'lessons'
  AND column_name = 'student_id';
