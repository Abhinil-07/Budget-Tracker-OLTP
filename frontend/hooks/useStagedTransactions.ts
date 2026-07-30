"use client";

import { useState, useEffect, useCallback } from "react";
import { useCategories } from "./useCategories";

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
  const [stagedList, setStagedList] = useState<StagedTransactionItem[]>([]);
  const { categories } = useCategories();

  // Load staged list from localStorage / window events
  const loadStaged = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setStagedList(JSON.parse(stored));
      } else {
        setStagedList([]);
      }
    } catch (e) {
      console.error("Failed to load staged transactions:", e);
    }
  }, []);

  useEffect(() => {
    loadStaged();

    const handleCustomEvent = () => loadStaged();
    window.addEventListener("staged_queue_updated", handleCustomEvent);
    window.addEventListener("storage", handleCustomEvent);

    return () => {
      window.removeEventListener("staged_queue_updated", handleCustomEvent);
      window.removeEventListener("storage", handleCustomEvent);
    };
  }, [loadStaged]);

  const notifyChange = (newList: StagedTransactionItem[]) => {
    setStagedList(newList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    window.dispatchEvent(new Event("staged_queue_updated"));
  };

  const addStagedTransaction = (item: Omit<StagedTransactionItem, "id" | "created_at">) => {
    const newItem: StagedTransactionItem = {
      ...item,
      id: "staged_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      created_at: new Date().toISOString(),
    };
    const updated = [newItem, ...stagedList];
    notifyChange(updated);
    return newItem;
  };

  const updateStagedTransaction = (id: string, updates: Partial<StagedTransactionItem>) => {
    const updated = stagedList.map((item) => (item.id === id ? { ...item, ...updates } : item));
    notifyChange(updated);
  };

  const removeStagedTransaction = (id: string) => {
    const updated = stagedList.filter((item) => item.id !== id);
    notifyChange(updated);
  };

  const clearAllStaged = () => {
    notifyChange([]);
  };

  return {
    stagedTransactions: stagedList,
    stagedCount: stagedList.length,
    addStagedTransaction,
    updateStagedTransaction,
    removeStagedTransaction,
    clearAllStaged,
  };
}
