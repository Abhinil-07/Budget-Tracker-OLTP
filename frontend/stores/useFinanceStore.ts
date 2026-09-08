import { create } from "zustand";

interface FinanceState {
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  startingBalances: Record<string, number>;
  setStartingBalance: (accountId: string, amountCents: number) => void;
  hydrateFinance: () => void;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  selectedAccountId: null,
  setSelectedAccountId: (id) => set({ selectedAccountId: id }),
  startingBalances: {},
  setStartingBalance: (accountId, amountCents) => {
    set((state) => {
      const updated = { ...state.startingBalances, [accountId]: amountCents };
      if (typeof window !== "undefined") {
        localStorage.setItem("finance_starting_balances", JSON.stringify(updated));
      }
      return { startingBalances: updated };
    });
  },
  hydrateFinance: () => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("finance_starting_balances");
        if (stored) {
          set({ startingBalances: JSON.parse(stored) });
        }
      } catch (err) {
        console.error("Failed to parse starting balances from localStorage:", err);
      }
    }
  },
}));

