-- Add school field to users table for multi-tenancy support
-- This allows admins to see all students/teachers within their school

ALTER TABLE users
ADD COLUMN IF NOT EXISTS school VARCHAR(255);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school);

-- Update existing demo accounts with school assignments
UPDATE users SET school = 'school1' WHERE email IN ('admin1@school1.com', 'teacher1@school1.com', 'teacher2@school1.com');
UPDATE users SET school = 'school2' WHERE email IN ('admin2@school2.com', 'teacher3@school2.com');
UPDATE users SET school = 'demo' WHERE email = 'demo@demo.com';

-- Note: Existing production users will have school = NULL
-- They can be assigned to schools via AdminPanel
