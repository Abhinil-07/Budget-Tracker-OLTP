import { Account, CreateAccountDto, UpdateAccountDto } from "../types/account";
import { Transaction, CreateTransactionDto, UpdateTransactionDto, TransactionQuery, PaginatedTransactions, BatchCreateTransactionsDto, BatchCreateResponse } from "../types/transaction";
import { BudgetAggregatedDto, UpdateBudgetDto } from "../types/budget";
import { SyncLog } from "../types/sync";
import { Investment, CreateInvestmentDto, UpdateInvestmentDto, UpdateInvestmentValueDto } from "../types/investment";
import { GymSession, CreateGymSessionDto, UpdateGymSessionDto } from "../types/gym";
import { MealLog, CreateMealLogDto, UpdateMealLogDto } from "../types/food";
import { StudyLog, CreateStudyLogDto, UpdateStudyLogDto, StudyGoal, CreateStudyGoalDto, UpdateStudyGoalDto } from "../types/study";
import { MediaItem, CreateMediaItemDto, UpdateMediaItemDto } from "../types/media";
import { Person, PersonBalance, Settlement } from "../types/split";

import {
  getInMemoryToken,
  getInMemoryRefreshToken,
  getInMemoryExpiresAt,
  useAuthStore,
} from "../stores/useAuthStore";

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
    const msg =
      payload?.error?.message ||
      (typeof payload?.detail === "string" ? payload.detail : null) ||
      `API Error (${status})`;
    super(msg);
    this.name = "ApiError";
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Single-flight promise so parallel requests share the exact same refresh call
let activeRefreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      let refreshToken =
        getInMemoryRefreshToken() ||
        (typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null);

      if (!refreshToken && typeof window !== "undefined") {
        const keys = Object.keys(localStorage);
        const supabaseKey = keys.find(key => key.startsWith("sb-") && key.endsWith("-auth-token"));
        if (supabaseKey) {
          try {
            const data = JSON.parse(localStorage.getItem(supabaseKey) || "{}");
            refreshToken = data.currentSession?.refresh_token || data.refresh_token || null;
          } catch {
            // Ignore parse errors
          }
        }
      }

      if (!refreshToken) {
        return null;
      }

      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        // If refresh token is truly invalid/expired, log out to prevent infinite loops
        if (res.status === 401 && typeof window !== "undefined") {
          useAuthStore.getState().logout();
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
        return null;
      }

      const resJson = await res.json();
      const authData = resJson.data;

      if (authData?.access_token) {
        useAuthStore
          .getState()
          .updateTokens(
            authData.access_token,
            authData.refresh_token,
            authData.expires_at
          );
        return authData.access_token;
      }
      return null;
    } catch (err) {
      console.error("Token refresh failed:", err);
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
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
  // 1. Proactive expiry check: if token expires within 60 seconds, refresh before call
  const expiresAt =
    getInMemoryExpiresAt() ||
    (typeof window !== "undefined"
      ? Number(localStorage.getItem("token_expires_at") || "0")
      : 0);

  if (expiresAt > 0 && Date.now() / 1000 > expiresAt - 60 && !path.includes("/auth/")) {
    await refreshAccessToken();
  }

  const token = getToken();

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  // 2. Reactive 401 retry: if unauthorized, refresh session silently and replay request once
  if (res.status === 401 && !path.includes("/auth/")) {
    const freshToken = await refreshAccessToken();
    if (freshToken) {
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          ...options?.headers,
          "Content-Type": "application/json",
          Authorization: `Bearer ${freshToken}`,
        },
      });
    } else {
      // Refresh token failed or is missing: the session is dead.
      // Clear zombie credentials so user is redirected to clean login instead of broken dashboard.
      if (typeof window !== "undefined") {
        useAuthStore.getState().logout();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }
  }

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
        method: "PUT",
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
    batchCreate: (body: BatchCreateTransactionsDto) =>
      request<BatchCreateResponse>("/api/transactions/batch", {
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
    listStaged: () => request<Transaction[]>("/api/transactions/staged"),
    approveStaged: (id: string, body: UpdateTransactionDto) =>
      request<Transaction>(`/api/transactions/staged/${id}/approve`, {
        method: "POST",
        body: JSON.stringify(body),
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
  gym: {
    list: (params?: { date_from?: string; date_to?: string; split_type?: string }) =>
      request<GymSession[]>(`/api/gym${params ? `?${toQueryString(params)}` : ""}`),
    create: (body: CreateGymSessionDto) =>
      request<GymSession>("/api/gym", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateGymSessionDto) =>
      request<GymSession>(`/api/gym/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string; id: string }>(`/api/gym/${id}`, {
        method: "DELETE",
      }),
  },
  food: {
    list: (params?: { date_from?: string; date_to?: string; meal_slot?: string; tag?: string }) =>
      request<MealLog[]>(`/api/food${params ? `?${toQueryString(params)}` : ""}`),
    create: (body: CreateMealLogDto) =>
      request<MealLog>("/api/food", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateMealLogDto) =>
      request<MealLog>(`/api/food/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string; id: string }>(`/api/food/${id}`, {
        method: "DELETE",
      }),
  },
  study: {
    list: (params?: { date_from?: string; date_to?: string; topic?: string }) =>
      request<StudyLog[]>(`/api/study${params ? `?${toQueryString(params)}` : ""}`),
    create: (body: CreateStudyLogDto) =>
      request<StudyLog>("/api/study", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateStudyLogDto) =>
      request<StudyLog>(`/api/study/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string; id: string }>(`/api/study/${id}`, {
        method: "DELETE",
      }),
    listGoals: (params?: { month?: string; status?: string }) =>
      request<StudyGoal[]>(`/api/study/goals${params ? `?${toQueryString(params)}` : ""}`),
    createGoal: (body: CreateStudyGoalDto) =>
      request<StudyGoal>("/api/study/goals", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateGoal: (id: string, body: UpdateStudyGoalDto) =>
      request<StudyGoal>(`/api/study/goals/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    deleteGoal: (id: string) =>
      request<{ success: boolean; message: string; id: string }>(`/api/study/goals/${id}`, {
        method: "DELETE",
      }),
  },
  media: {
    list: (params?: { media_type?: string; status?: string }) =>
      request<MediaItem[]>(`/api/media${params ? `?${toQueryString(params)}` : ""}`),
    create: (body: CreateMediaItemDto) =>
      request<MediaItem>("/api/media", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateMediaItemDto) =>
      request<MediaItem>(`/api/media/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string; id: string }>(`/api/media/${id}`, {
        method: "DELETE",
      }),
  },
  splits: {
    balances: () => request<PersonBalance[]>("/api/splits/balances"),
    people: () => request<Person[]>("/api/splits/people"),
    settle: (body: { from_person: string; to_person: string; amount_paise: number; note?: string; date?: string }) =>
      request<Settlement>("/api/splits/settle", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  auth: {
    sendOtp: (identifier: string) =>
      request<{ email: string; masked_email: string; via_phone: boolean; message: string }>("/api/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ identifier }),
      }),
    verifyOtp: (email: string, token: string) =>
      request<{
        access_token: string;
        refresh_token: string;
        expires_at: number;
        expires_in: number;
        user: { id: string; email: string; phone?: string | null };
      }>("/api/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ email, token }),
      }),
    getProfile: () =>
      request<{ id: string; email: string; phone?: string | null }>("/api/auth/profile"),
    updatePhone: (phone: string) =>
      request<{ phone: string; message: string }>("/api/auth/profile/phone", {
        method: "PUT",
        body: JSON.stringify({ phone }),
      }),
  },
};
