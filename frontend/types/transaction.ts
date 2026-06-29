import { Category } from "../lib/constants";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  account_id: string;
  type: TransactionType;
  amount_cents: number;
  category: Category;
  description?: string;
  txn_date: string;
  created_at: string;
}

export interface CreateTransactionDto {
  account_id: string;
  type: TransactionType;
  amount_cents: number;
  category: Category;
  description?: string;
  txn_date: string;
}

export interface TransactionQuery {
  account_id?: string;
  category?: string;
  type?: TransactionType;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface UpdateTransactionDto {
  account_id?: string;
  type?: TransactionType;
  amount_cents?: number;
  category?: Category;
  description?: string;
  txn_date?: string;
}

export interface PaginatedTransactions {
  items: Transaction[];
  total: number;
  page: number;
  page_size: number;
}

export interface DeleteTransactionResponse {
  success: boolean;
  message: string;
  id: string;
}
