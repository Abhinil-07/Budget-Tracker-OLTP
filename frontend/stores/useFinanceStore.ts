import { create } from "zustand";

interface FinanceState {
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  selectedAccountId: null,
  setSelectedAccountId: (id) => set({ selectedAccountId: id }),
}));
