"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { PersonBalance, Person } from "../types/split";
import { useAuthStore } from "../stores/useAuthStore";

export function useBalances() {
  const { token, hydrated } = useAuthStore();
  return useQuery({
    queryKey: ["person-balances"],
    queryFn: async () => {
      const res = await api.splits.balances();
      return res.data || [];
    },
    enabled: hydrated && !!token,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
}

export function usePeople() {
  const { token, hydrated } = useAuthStore();
  return useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const res = await api.splits.people();
      return res.data || [];
    },
    enabled: hydrated && !!token,
  });
}

export function useSettle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      from_person: string;
      to_person: string;
      amount_paise: number;
      note?: string;
      date?: string;
    }) => {
      const res = await api.splits.settle(payload);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["person-balances"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
