export interface StudyLog {
  id: string;
  user_id: string;
  study_date: string; // YYYY-MM-DD
  topic?: string | null;
  minutes?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStudyLogDto {
  study_date: string;
  topic?: string;
  minutes?: number;
  notes?: string;
}

export interface UpdateStudyLogDto {
  study_date?: string;
  topic?: string;
  minutes?: number;
  notes?: string;
}

export type GoalStatus = "not_started" | "in_progress" | "done";

export interface StudyGoal {
  id: string;
  user_id: string;
  month: string; // YYYY-MM-01
  goal_text?: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateStudyGoalDto {
  month: string;
  goal_text: string;
  status?: GoalStatus;
}

export interface UpdateStudyGoalDto {
  month?: string;
  goal_text?: string;
  status?: GoalStatus;
}
