export type AccountType = "savings" | "current" | "credit_card";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance_cents: number;
  currency: string;
  account_number?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountDto {
  name: string;
  type: AccountType;
  opening_balance: number;
  currency?: string;
  account_number?: string;
}

export interface UpdateAccountDto {
  name?: string;
  currency?: string;
  account_number?: string;
  balance_cents?: number;
}
