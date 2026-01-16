export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone_number: string | null
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          first_name: string
          last_name: string
          phone_number?: string | null
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          phone_number?: string | null
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      participants: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          email: string | null
          bereavement_circle: string | null
          bereavement_detail: string | null
          general_notes: string | null
          last_attendance: string | null
          updates: string | null
          is_archived: boolean
          created_at: string
          last_phone_call: string | null
        }
        Insert: {
          id?: string
          full_name: string
          phone?: string | null
          email?: string | null
          bereavement_circle?: string | null
          bereavement_detail?: string | null
          general_notes?: string | null
          last_attendance?: string | null
          updates?: string | null
          is_archived?: boolean
          created_at?: string
          last_phone_call?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string | null
          email?: string | null
          bereavement_circle?: string | null
          bereavement_detail?: string | null
          general_notes?: string | null
          last_attendance?: string | null
          updates?: string | null
          is_archived?: boolean
          created_at?: string
          last_phone_call?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          participant_id: string | null
          status: string
          due_date: string | null
          done_at: string | null
          done_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          participant_id?: string | null
          status?: string
          due_date?: string | null
          done_at?: string | null
          done_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          participant_id?: string | null
          status?: string
          due_date?: string | null
          done_at?: string | null
          done_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_activities: {
        Row: {
          id: string
          user_id: string
          activity_type: string
          participant_id: string | null
          participant_name: string | null
          description: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_type: string
          participant_id?: string | null
          participant_name?: string | null
          description: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_type?: string
          participant_id?: string | null
          participant_name?: string | null
          description?: string
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
