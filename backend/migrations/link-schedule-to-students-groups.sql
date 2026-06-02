-- Migration: Link Personal Schedule to Students and Groups
-- Date: 2026-02-16
-- Purpose: Connect Teacher Earnings schedule with actual Students and Groups from the system

-- Add studentId and groupId to personal_schedule_slots
ALTER TABLE personal_schedule_slots
ADD COLUMN IF NOT EXISTS "studentId" TEXT,
ADD COLUMN IF NOT EXISTS "groupId" TEXT;

-- Add foreign key constraints
ALTER TABLE personal_schedule_slots
ADD CONSTRAINT "personal_schedule_slots_studentId_fkey"
FOREIGN KEY ("studentId")
REFERENCES students(id)
ON DELETE SET NULL;

ALTER TABLE personal_schedule_slots
ADD CONSTRAINT "personal_schedule_slots_groupId_fkey"
FOREIGN KEY ("groupId")
REFERENCES groups(id)
ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "personal_schedule_slots_studentId_idx" ON personal_schedule_slots("studentId");
CREATE INDEX IF NOT EXISTS "personal_schedule_slots_groupId_idx" ON personal_schedule_slots("groupId");

-- Add customStudentId and customGroupId to completed_lessons
ALTER TABLE completed_lessons
ADD COLUMN IF NOT EXISTS "customStudentId" TEXT,
ADD COLUMN IF NOT EXISTS "customGroupId" TEXT;

-- Add foreign key constraints for completed lessons
ALTER TABLE completed_lessons
ADD CONSTRAINT "completed_lessons_customStudentId_fkey"
FOREIGN KEY ("customStudentId")
REFERENCES students(id)
ON DELETE SET NULL;

ALTER TABLE completed_lessons
ADD CONSTRAINT "completed_lessons_customGroupId_fkey"
FOREIGN KEY ("customGroupId")
REFERENCES groups(id)
ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS "completed_lessons_customStudentId_idx" ON completed_lessons("customStudentId");
CREATE INDEX IF NOT EXISTS "completed_lessons_customGroupId_idx" ON completed_lessons("customGroupId");
