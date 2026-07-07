import { Account, CreateAccountDto, UpdateAccountDto } from "../types/account";
import { Transaction, CreateTransactionDto, UpdateTransactionDto, TransactionQuery, PaginatedTransactions } from "../types/transaction";
import { BudgetAggregatedDto, UpdateBudgetDto } from "../types/budget";
import { SyncLog } from "../types/sync";
import { Investment, CreateInvestmentDto, UpdateInvestmentDto, UpdateInvestmentValueDto } from "../types/investment";

import { getInMemoryToken } from "../stores/useAuthStore";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ApiResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
  meta?: Record<string, any>;
}

export class ApiError extends Error {
  constructor(public status: number, public payload: any) {
    super(payload?.error?.message || `API Error (${status})`);
    this.name = "ApiError";
  }
}

function getToken(): string {
  // 1. Try to fetch from memory token first
  const memoryToken = getInMemoryToken();
  if (memoryToken) return memoryToken;

  if (typeof window === "undefined") return "";
  
  // 2. Direct access token override (for tests/local dev helper)
  const token = localStorage.getItem("access_token");
  if (token) return token;

  // 3. Scan localStorage for any Supabase auth token
  const keys = Object.keys(localStorage);
  const supabaseKey = keys.find(key => key.startsWith("sb-") && key.endsWith("-auth-token"));
  if (supabaseKey) {
    try {
      const data = JSON.parse(localStorage.getItem(supabaseKey) || "{}");
      if (data.currentSession?.access_token) {
        return data.currentSession.access_token;
      }
      if (data.access_token) {
        return data.access_token;
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // 4. Fallback dev key
  return "dev-local-key-12345";
}

function toQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      searchParams.append(key, String(val));
    }
  });
  return searchParams.toString();
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorDetail;
    try {
      errorDetail = await res.json();
    } catch {
      errorDetail = { error: { message: "Internal Server Error" } };
    }
    throw new ApiError(res.status, errorDetail);
  }

  return res.json();
}

export const api = {
  accounts: {
    list: () => request<Account[]>("/api/accounts"),
    create: (body: CreateAccountDto) =>
      request<Account>("/api/accounts", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateAccountDto) =>
      request<Account>(`/api/accounts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string; id: string }>(`/api/accounts/${id}`, {
        method: "DELETE",
      }),
  },
  transactions: {
    list: (params: TransactionQuery) =>
      request<PaginatedTransactions>(
        `/api/transactions?${toQueryString(params)}`,
      ),
    create: (body: CreateTransactionDto) =>
      request<Transaction>("/api/transactions", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateTransactionDto) =>
      request<Transaction>(`/api/transactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string; id: string }>(`/api/transactions/${id}`, {
        method: "DELETE",
      }),
  },
  budget: {
    get: (month?: string) => request<BudgetAggregatedDto>(month ? `/api/budget?month=${month}` : "/api/budget"),
    update: (body: UpdateBudgetDto, month?: string) =>
      request<BudgetAggregatedDto>(month ? `/api/budget?month=${month}` : "/api/budget", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
  },
  sync: {
    status: () => request<SyncLog>("/api/sync/status"),
    trigger: () => request<{ message: string }>("/api/sync/trigger", {
      method: "POST",
    }),
  },
  investments: {
    list: () => request<Investment[]>("/api/investments"),
    create: (body: CreateInvestmentDto) =>
      request<Investment>("/api/investments", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateInvestmentDto) =>
      request<Investment>(`/api/investments/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    updateValue: (id: string, body: UpdateInvestmentValueDto) =>
      request<Investment>(`/api/investments/${id}/value`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string; id: string }>(`/api/investments/${id}`, {
        method: "DELETE",
      }),
  },
};
