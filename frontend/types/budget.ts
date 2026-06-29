export interface Budget {
  id: string;
  month: string; // YYYY-MM-DD (1st of the month)
  total_cents: number;
  category_limits?: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface UpdateBudgetDto {
  total_cents: number;
  category_limits?: Record<string, number>;
}

export interface BudgetCategoryBreakdown {
  category: string;
  limit_cents: number | null;
  spent_cents: number;
  remaining_cents: number;
  percentage_used: number;
}

export interface BudgetAggregatedDto {
  id: string | null;
  month: string;
  total_cents: number;
  mtd_spent_cents: number;
  remaining_cents: number;
  percentage_used: number;
  category_limits: Record<string, number> | null;
  category_breakdown: BudgetCategoryBreakdown[];
}
