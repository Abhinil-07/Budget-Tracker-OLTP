import { create } from "zustand";

export interface AuthUser {
  email: string;
  id: string;
  phone?: string | null;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null; // Unix timestamp in seconds
  user: AuthUser | null;
  hydrated: boolean;
  setAuth: (
    token: string,
    user: AuthUser,
    refreshToken?: string | null,
    expiresAt?: number | null
  ) => void;
  updateTokens: (
    token: string,
    refreshToken?: string | null,
    expiresAt?: number | null
  ) => void;
  setUserPhone: (phone: string) => void;
  logout: () => void;
  hydrate: () => void;
}

// In-memory tokens for the API client (avoids repeated localStorage reads on every fetch)
let inMemoryToken: string | null = null;
let inMemoryRefreshToken: string | null = null;
let inMemoryExpiresAt: number | null = null;

export const getInMemoryToken = () => inMemoryToken;
export const getInMemoryRefreshToken = () => inMemoryRefreshToken;
export const getInMemoryExpiresAt = () => inMemoryExpiresAt;

export const setInMemoryToken = (token: string | null) => {
  inMemoryToken = token;
};
export const setInMemoryRefreshToken = (token: string | null) => {
  inMemoryRefreshToken = token;
};
export const setInMemoryExpiresAt = (expiresAt: number | null) => {
  inMemoryExpiresAt = expiresAt;
};

export const useAuthStore = create<AuthState>((set) => {
  // Pre-populate initial state from localStorage if running in browser
  const getInitialSnapshot = () => {
    if (typeof window === "undefined") {
      return {
        token: null,
        refreshToken: null,
        expiresAt: null,
        user: null,
        hydrated: false,
      };
    }
    try {
      const token = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");
      const expiresAtStr = localStorage.getItem("token_expires_at");
      const expiresAt = expiresAtStr ? Number(expiresAtStr) : null;
      const email = localStorage.getItem("user_email");
      const id = localStorage.getItem("user_id") || "user";
      const phone = localStorage.getItem("user_phone");

      if (token && email) {
        setInMemoryToken(token);
        setInMemoryRefreshToken(refreshToken);
        setInMemoryExpiresAt(expiresAt);
        return {
          token,
          refreshToken,
          expiresAt,
          user: { email, id, phone: phone || null },
          hydrated: true,
        };
      }
    } catch {
      // Ignore localStorage access restrictions
    }
    return {
      token: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
      hydrated: false,
    };
  };

  const initialSnapshot = getInitialSnapshot();

  // Listen to storage events to sync auth state across browser tabs
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (
        e.key === "access_token" ||
        e.key === "refresh_token" ||
        e.key === "token_expires_at" ||
        e.key === "user_email"
      ) {
        const token = localStorage.getItem("access_token");
        const refreshToken = localStorage.getItem("refresh_token");
        const expiresAtStr = localStorage.getItem("token_expires_at");
        const expiresAt = expiresAtStr ? Number(expiresAtStr) : null;
        const email = localStorage.getItem("user_email");
        const id = localStorage.getItem("user_id") || "user";
        const phone = localStorage.getItem("user_phone");

        setInMemoryToken(token);
        setInMemoryRefreshToken(refreshToken);
        setInMemoryExpiresAt(expiresAt);

        if (token && email) {
          set({
            token,
            refreshToken,
            expiresAt,
            user: { email, id, phone: phone || null },
            hydrated: true,
          });
        } else {
          set({
            token: null,
            refreshToken: null,
            expiresAt: null,
            user: null,
            hydrated: true,
          });
        }
      }
    });
  }

  return {
    ...initialSnapshot,

    setAuth: (token, user, refreshToken = null, expiresAt = null) => {
      setInMemoryToken(token);
      setInMemoryRefreshToken(refreshToken);
      setInMemoryExpiresAt(expiresAt);

      set({ token, refreshToken, expiresAt, user, hydrated: true });

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("access_token", token);
          if (refreshToken) {
            localStorage.setItem("refresh_token", refreshToken);
          }
          if (expiresAt) {
            localStorage.setItem("token_expires_at", String(expiresAt));
          }
          localStorage.setItem("user_email", user.email);
          localStorage.setItem("user_id", user.id);
          if (user.phone) {
            localStorage.setItem("user_phone", user.phone);
          } else {
            localStorage.removeItem("user_phone");
          }
        } catch {
          // Ignore storage quota errors
        }
      }
    },

    updateTokens: (token, refreshToken = null, expiresAt = null) => {
      setInMemoryToken(token);
      if (refreshToken) setInMemoryRefreshToken(refreshToken);
      if (expiresAt) setInMemoryExpiresAt(expiresAt);

      set((state) => ({
        token,
        refreshToken: refreshToken || state.refreshToken,
        expiresAt: expiresAt || state.expiresAt,
      }));

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("access_token", token);
          if (refreshToken) {
            localStorage.setItem("refresh_token", refreshToken);
          }
          if (expiresAt) {
            localStorage.setItem("token_expires_at", String(expiresAt));
          }
        } catch {
          // Ignore storage quota errors
        }
      }
    },

    setUserPhone: (phone: string) => {
      set((state) => ({
        user: state.user ? { ...state.user, phone } : null,
      }));
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("user_phone", phone);
        } catch {}
      }
    },

    logout: () => {
      setInMemoryToken(null);
      setInMemoryRefreshToken(null);
      setInMemoryExpiresAt(null);

      set({ token: null, refreshToken: null, expiresAt: null, user: null, hydrated: true });

      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("token_expires_at");
          localStorage.removeItem("user_email");
          localStorage.removeItem("user_id");
          localStorage.removeItem("user_phone");

          // Also purge legacy Supabase SDK storage items to avoid ghost sessions
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
              localStorage.removeItem(key);
            }
          });
        } catch {}
      }
    },

    hydrate: () => {
      if (typeof window === "undefined") {
        set({ hydrated: true });
        return;
      }

      try {
        const token = localStorage.getItem("access_token");
        const refreshToken = localStorage.getItem("refresh_token");
        const expiresAtStr = localStorage.getItem("token_expires_at");
        const expiresAt = expiresAtStr ? Number(expiresAtStr) : null;
        const email = localStorage.getItem("user_email");
        const id = localStorage.getItem("user_id") || "user";
        const phone = localStorage.getItem("user_phone");

        if (token && email) {
          setInMemoryToken(token);
          setInMemoryRefreshToken(refreshToken);
          setInMemoryExpiresAt(expiresAt);

          set({
            token,
            refreshToken,
            expiresAt,
            user: { email, id, phone: phone || null },
            hydrated: true,
          });
        } else {
          set({ hydrated: true });
        }
      } catch {
        set({ hydrated: true });
      }
    },
  };
});
