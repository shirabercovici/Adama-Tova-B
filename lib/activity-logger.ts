/**
 * Utility functions for logging user activities
 */

export type ActivityType = 
  | 'phone_call' 
  | 'attendance_marked' 
  | 'attendance_removed'
  | 'status_update'
  | 'participant_updated';

export interface ActivityLog {
  user_id: string;
  activity_type: ActivityType;
  participant_id?: string;
  participant_name?: string;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Log an activity to the database via API
 */
export async function logActivity(activity: ActivityLog): Promise<void> {
  try {
    const response = await fetch('/api/activities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activity),
    });

    if (!response.ok) {
      console.error('Failed to log activity:', await response.text());
    }
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - activity logging should not break the main flow
  }
}
