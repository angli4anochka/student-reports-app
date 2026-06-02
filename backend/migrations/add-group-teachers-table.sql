-- Migration: Add group_teachers table for many-to-many relationship
-- This allows multiple teachers to collaborate on the same group

-- Create group_teachers junction table
CREATE TABLE IF NOT EXISTS group_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Foreign keys
  CONSTRAINT fk_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,

  -- Prevent duplicate entries
  CONSTRAINT unique_group_teacher UNIQUE (group_id, teacher_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_group_teachers_group_id ON group_teachers(group_id);
CREATE INDEX IF NOT EXISTS idx_group_teachers_teacher_id ON group_teachers(teacher_id);

-- Add comment
COMMENT ON TABLE group_teachers IS 'Junction table for many-to-many relationship between teachers and groups (for collaborative teaching)';
