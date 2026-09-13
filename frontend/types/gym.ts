export interface GymSession {
  id: string;
  user_id: string;
  session_date: string; // YYYY-MM-DD
  split_type?: string | null;
  exercises?: string | null;
  duration_minutes?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGymSessionDto {
  session_date: string;
  split_type?: string;
  exercises?: string;
  duration_minutes?: number;
  notes?: string;
}

export interface UpdateGymSessionDto {
  session_date?: string;
  split_type?: string;
  exercises?: string;
  duration_minutes?: number;
  notes?: string;
}
