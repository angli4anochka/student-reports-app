-- Migration: Add tables for Glasses (Points & Badges) feature
-- Created: 2026-02-09

-- Create glasses_groups table
CREATE TABLE IF NOT EXISTS glasses_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_glasses_groups_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create glasses_students table
CREATE TABLE IF NOT EXISTS glasses_students (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  group_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_glasses_students_group FOREIGN KEY (group_id) REFERENCES glasses_groups(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_glasses_groups_teacher_id ON glasses_groups(teacher_id);
CREATE INDEX IF NOT EXISTS idx_glasses_students_group_id ON glasses_students(group_id);

-- Success message
SELECT 'Glasses tables created successfully!' as status;
