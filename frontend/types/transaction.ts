import { TransactionSplit } from "./split";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  account_id: string;
  type: TransactionType;
  amount_cents: number;
  category: string;
  description?: string;
  txn_date: string;
  status?: string;
  is_included?: boolean;
  telegram_chat_id?: string;
  telegram_message_id?: number;
  splits?: TransactionSplit[];
  created_at: string;
}

export interface CreateTransactionDto {
  account_id: string;
  type: TransactionType;
  amount_cents: number;
  category: string;
  description?: string;
  txn_date: string;
  is_included?: boolean;
}

export interface TransactionQuery {
  account_id?: string;
  category?: string;
  type?: TransactionType;
  is_included?: boolean;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface UpdateTransactionDto {
  account_id?: string;
  type?: TransactionType;
  amount_cents?: number;
  category?: string;
  description?: string;
  txn_date?: string;
  is_included?: boolean;
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

export interface BatchCreateTransactionsDto {
  items: CreateTransactionDto[];
}

export interface BatchCreateResponse {
  imported_count: number;
  account_ids: string[];
}
