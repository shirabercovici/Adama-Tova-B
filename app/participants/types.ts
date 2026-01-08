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

export interface Task {
  id: string;
  title: string;
  status: 'open' | 'done'; // Assuming 'done' is the other status
  due_date: string | null;
  participant_id: string | null;
  done_at: string | null;
  done_by: string | null;
  done_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

