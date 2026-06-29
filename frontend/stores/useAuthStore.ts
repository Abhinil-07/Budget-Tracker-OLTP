import { create } from "zustand";

interface AuthUser {
  email: string;
  id: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
  hydrate: () => void;
}

// In-memory token for the API client (avoids localStorage reads on every fetch)
let inMemoryToken: string | null = null;

export const getInMemoryToken = () => inMemoryToken;
export const setInMemoryToken = (token: string | null) => {
  inMemoryToken = token;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrated: false,

  setAuth: (token, user) => {
    setInMemoryToken(token);
    set({ token, user });
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", token);
      localStorage.setItem("user_email", user.email);
      localStorage.setItem("user_id", user.id);
    }
  },

  logout: () => {
    setInMemoryToken(null);
    set({ token: null, user: null });
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_email");
      localStorage.removeItem("user_id");
    }
  },

  hydrate: () => {
    if (typeof window === "undefined") {
      set({ hydrated: true });
      return;
    }
    const token = localStorage.getItem("access_token");
    const email = localStorage.getItem("user_email");
    const id = localStorage.getItem("user_id");
    if (token && email && id) {
      setInMemoryToken(token);
      set({ token, user: { email, id }, hydrated: true });
    } else {
      set({ hydrated: true });
    }
  },
}));
