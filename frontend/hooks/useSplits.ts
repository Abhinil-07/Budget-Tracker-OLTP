"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { PersonBalance, Person } from "../types/split";

export function useBalances() {
  return useQuery({
    queryKey: ["person-balances"],
    queryFn: async () => {
      const res = await api.splits.balances();
      return res.data || [];
    },
    refetchInterval: 15000,
  });
}

export function usePeople() {
  return useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const res = await api.splits.people();
      return res.data || [];
    },
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
