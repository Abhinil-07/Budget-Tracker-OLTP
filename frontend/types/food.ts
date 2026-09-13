export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealLog {
  id: string;
  user_id: string;
  meal_date: string; // YYYY-MM-DD
  meal_slot: MealSlot;
  what_i_ate?: string | null;
  tag?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMealLogDto {
  meal_date: string;
  meal_slot: MealSlot;
  what_i_ate?: string;
  tag?: string;
  notes?: string;
}

export interface UpdateMealLogDto {
  meal_date?: string;
  meal_slot?: MealSlot;
  what_i_ate?: string;
  tag?: string;
  notes?: string;
}
