import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CATEGORIES } from "../lib/constants";
import { api } from "../lib/api";

const CUSTOM_CATEGORIES_KEY = "custom_categories";
const CATEGORIES_EVENT = "custom_categories_changed";

export function getCustomCategories(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomCategories(categories: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));
    window.dispatchEvent(new Event(CATEGORIES_EVENT));
  } catch (err) {
    console.error("Failed to save custom categories:", err);
  }
}

export function useCategories() {
  const [customCategories, setCustomCategories] = useState<string[]>(getCustomCategories);

  // Sync custom categories when localStorage changes or event triggers
  useEffect(() => {
    const syncCategories = () => {
      setCustomCategories(getCustomCategories());
    };

    window.addEventListener(CATEGORIES_EVENT, syncCategories);
    window.addEventListener("storage", syncCategories);

    return () => {
      window.removeEventListener(CATEGORIES_EVENT, syncCategories);
      window.removeEventListener("storage", syncCategories);
    };
  }, []);

  // Fetch transactions to dynamically discover categories used in the DB
  const { data: transactionsData } = useQuery({
    queryKey: ["transactions-categories-discovery"],
    queryFn: () => api.transactions.list({ page_size: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const discoveredCategories = useMemo(() => {
    if (!transactionsData?.data?.items) return [];
    return transactionsData.data.items
      .map((t) => t.category)
      .filter((cat): cat is string => Boolean(cat) && typeof cat === "string");
  }, [transactionsData]);

  // Combine defaults + custom categories + discovered categories (deduplicated)
  const categories = useMemo(() => {
    const set = new Set<string>();
    
    // 1. Base defaults
    CATEGORIES.forEach((cat) => set.add(cat));
    
    // 2. User custom categories
    customCategories.forEach((cat) => {
      if (cat.trim()) set.add(cat.trim());
    });
    
    // 3. Categories found in transactions
    discoveredCategories.forEach((cat) => {
      if (cat.trim()) set.add(cat.trim());
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [customCategories, discoveredCategories]);

  const addCategory = useCallback((newCategory: string) => {
    const trimmed = newCategory.trim();
    if (!trimmed) return false;

    const currentCustom = getCustomCategories();
    if (!currentCustom.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...currentCustom, trimmed];
      saveCustomCategories(updated);
    }
    return true;
  }, []);

  const removeCategory = useCallback((categoryToRemove: string) => {
    const currentCustom = getCustomCategories();
    const updated = currentCustom.filter(
      (c) => c.toLowerCase() !== categoryToRemove.toLowerCase()
    );
    saveCustomCategories(updated);
  }, []);

  return {
    categories,
    customCategories,
    addCategory,
    removeCategory,
  };
}
