export interface Participant {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  bereavement_circle: string;
  bereavement_detail: string;
  general_notes: string;
  last_attendance: string | null;
  updates: string;
  is_archived: boolean;
  created_at: string;
  last_phone_call: string | null;
}

export interface ParticipantsResponse {
  participants: Participant[];
}

