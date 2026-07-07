export type InvestmentType = "fixed_deposit" | "stock" | "mutual_fund" | "ppf";

export interface Investment {
  id: string;
  user_id: string;
  name: string;
  type: InvestmentType;
  invested_amount_cents: number;
  current_value_cents: number;
  interest_rate?: number | null;
  maturity_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInvestmentDto {
  name: string;
  type: InvestmentType;
  invested_amount_cents: number;
  current_value_cents: number;
  interest_rate?: number | null;
  maturity_date?: string | null;
  notes?: string | null;
}

export interface UpdateInvestmentDto {
  name?: string;
  invested_amount_cents?: number;
  current_value_cents?: number;
  interest_rate?: number | null;
  maturity_date?: string | null;
  notes?: string | null;
}

export interface UpdateInvestmentValueDto {
  invested_amount_cents: number;
  current_value_cents: number;
}
