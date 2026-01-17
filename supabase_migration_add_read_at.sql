-- Migration: Add is_read column to user_activities table
-- This column tracks if a status update was marked as read

ALTER TABLE user_activities 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Create index for faster queries by is_read
CREATE INDEX IF NOT EXISTS idx_user_activities_is_read ON user_activities(is_read);
