"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Transaction } from "../types/transaction";

export interface StagedTransactionItem {
  id: string;
  account_id: string;
  type: "expense" | "income";
  amount_cents: number;
  category: string;
  description: string;
  txn_date: string;
  source?: "sms" | "email" | "manual";
  raw_text?: string;
  created_at: string;
}

const STORAGE_KEY = "staged_transactions_queue";

export function useStagedTransactions() {
  const queryClient = useQueryClient();
  const [localStaged, setLocalStaged] = useState<StagedTransactionItem[]>([]);

  // 1. Fetch remote staged transactions from Supabase DB via React Query
  const { data: remoteStaged = [], refetch } = useQuery({
    queryKey: ["staged-transactions"],
    queryFn: async () => {
      try {
        const res = await api.transactions.listStaged();
        return res.data || [];
      } catch (e) {
        return [];
      }
    },
    refetchInterval: 8000,
  });

  // Load local staged items
  const loadLocalStaged = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLocalStaged(JSON.parse(stored));
      } else {
        setLocalStaged([]);
      }
    } catch (e) {
      console.error("Failed to load local staged items:", e);
    }
  }, []);

  useEffect(() => {
    loadLocalStaged();

    const handleCustomEvent = () => loadLocalStaged();
    window.addEventListener("staged_queue_updated", handleCustomEvent);
    window.addEventListener("storage", handleCustomEvent);

    return () => {
      window.removeEventListener("staged_queue_updated", handleCustomEvent);
      window.removeEventListener("storage", handleCustomEvent);
    };
  }, [loadLocalStaged]);

  const notifyChange = (newList: StagedTransactionItem[]) => {
    setLocalStaged(newList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    window.dispatchEvent(new Event("staged_queue_updated"));
  };

  // Merge remote DB items + local items cleanly
  const allStaged = useMemo(() => {
    const formattedRemote: StagedTransactionItem[] = remoteStaged.map((t: Transaction) => ({
      id: t.id,
      account_id: t.account_id || "",
      type: (t.type as "expense" | "income") || "expense",
      amount_cents: t.amount_cents,
      category: t.category || "Miscellaneous",
      description: t.description || "",
      txn_date: t.txn_date,
      source: "email",
      created_at: t.created_at || new Date().toISOString(),
    }));

    const remoteIds = new Set(formattedRemote.map((r) => r.id));
    const uniqueLocal = localStaged.filter((l) => !remoteIds.has(l.id));

    return [...formattedRemote, ...uniqueLocal];
  }, [remoteStaged, localStaged]);

  const addStagedTransaction = (item: Omit<StagedTransactionItem, "id" | "created_at">) => {
    const newItem: StagedTransactionItem = {
      ...item,
      id: "staged_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      created_at: new Date().toISOString(),
    };
    const updated = [newItem, ...localStaged];
    notifyChange(updated);
    return newItem;
  };

  const updateStagedTransaction = (id: string, updates: Partial<StagedTransactionItem>) => {
    const updated = localStaged.map((item) => (item.id === id ? { ...item, ...updates } : item));
    notifyChange(updated);
  };

  const removeStagedTransaction = async (id: string) => {
    // 1. Instant optimistic state update
    setLocalStaged((prev) => prev.filter((item) => item.id !== id));
    queryClient.setQueryData(["staged-transactions"], (oldData: Transaction[] | undefined) => {
      if (!oldData) return [];
      return oldData.filter((t) => t.id !== id);
    });

    // 2. Clear from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored).filter((item: StagedTransactionItem) => item.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch (e) {}

    window.dispatchEvent(new Event("staged_queue_updated"));

    // 3. Delete from Supabase DB if remote UUID
    if (!id.startsWith("staged_")) {
      try {
        await api.transactions.delete(id);
        queryClient.invalidateQueries({ queryKey: ["staged-transactions"] });
      } catch (e) {
        console.error("Failed to delete remote staged item:", e);
      }
    }
  };

  const clearAllStaged = async () => {
    // Delete all remote items
    for (const item of allStaged) {
      if (!item.id.startsWith("staged_")) {
        try {
          await api.transactions.delete(item.id);
        } catch (e) {}
      }
    }
    notifyChange([]);
    queryClient.setQueryData(["staged-transactions"], []);
    queryClient.invalidateQueries({ queryKey: ["staged-transactions"] });
  };

  return {
    stagedTransactions: allStaged,
    stagedCount: allStaged.length,
    addStagedTransaction,
    updateStagedTransaction,
    removeStagedTransaction,
    clearAllStaged,
    refetchStaged: refetch,
  };
}
