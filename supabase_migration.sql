-- Migration: Create user_activities table for tracking all user activities
-- This table stores activity history for attendance, phone calls, status updates, etc.
-- Task completions are also tracked here (in addition to the tasks table)

CREATE TABLE IF NOT EXISTS user_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('phone_call', 'attendance_marked', 'attendance_removed', 'status_update', 'participant_updated')),
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  participant_name TEXT,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);

-- Create index for faster queries by created_at (for sorting)
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);

-- Create index for faster queries by activity_type
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON user_activities(activity_type);

-- Enable Row Level Security (RLS)
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own activities
CREATE POLICY "Users can view their own activities"
  ON user_activities
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Policy: Users can insert their own activities
CREATE POLICY "Users can insert their own activities"
  ON user_activities
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);
