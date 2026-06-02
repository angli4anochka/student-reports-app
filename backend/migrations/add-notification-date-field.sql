-- Add notification_date field to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS notification_date VARCHAR(255);
