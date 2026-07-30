"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import { useAccounts } from "../../hooks/useAccounts";
import { useCategories } from "../../hooks/useCategories";
import { CATEGORIES, ACCOUNT_TYPES } from "../../lib/constants";
import type { AccountType } from "../../lib/constants";

// --- Zod schema ---
const addTransactionSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
    }),
  type: z.enum(["expense", "income"]),
  account_id: z.string().min(1, "Select an account"),
  category: z.string().min(1, "Select a category"),
  description: z.string().optional(),
  txn_date: z.string().min(1, "Date is required"),
});

type AddTransactionForm = z.infer<typeof addTransactionSchema>;

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddTransactionModal({
  isOpen,
  onClose,
}: AddTransactionModalProps) {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useAccounts();
  const amountRef = useRef<HTMLInputElement | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<AddTransactionForm>({
    resolver: zodResolver(addTransactionSchema),
    defaultValues: {
      amount: "",
      type: "expense",
      account_id: "",
      category: "",
      description: "",
      txn_date: today,
    },
  });

  const selectedType = watch("type");
  const watchedAmount = watch("amount");

  const [isSplitEnabled, setIsSplitEnabled] = useState(false);
  const [splitCount, setSplitCount] = useState(2);

  // Live split shares calculations
  const parsedAmount = parseFloat(watchedAmount) || 0;
  const myShare = splitCount > 0 ? (parsedAmount / splitCount).toFixed(2) : "0.00";
  const roommateShare = splitCount > 0 ? (parsedAmount - parseFloat(myShare)).toFixed(2) : "0.00";

  const { categories, addCategory } = useCategories();
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleAddCustomCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    addCategory(trimmed);
    setValue("category", trimmed, { shouldValidate: true });
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  // Auto-focus amount field when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        amount: "",
        type: "expense",
        account_id: "",
        category: "",
        description: "",
        txn_date: today,
      });
      setIsSplitEnabled(false);
      setSplitCount(2);
      setIsAddingCategory(false);
      setNewCategoryName("");
      // Small delay to let the DOM render
      const timer = setTimeout(() => {
        amountRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, reset, today]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const onSubmit = async (data: AddTransactionForm) => {
    try {
      // Convert rupees to cents (integer, never float)
      const totalAmountCents = Math.round(Number(data.amount) * 100);

      if (data.type === "expense" && isSplitEnabled && splitCount > 1) {
        // Calculate shares in cents
        const myShareCents = Math.round((Number(data.amount) / splitCount) * 100);
        const roommateShareCents = totalAmountCents - myShareCents;

        // 1. Create Transaction 1 (Your Share)
        await api.transactions.create({
          account_id: data.account_id,
          type: "expense",
          amount_cents: myShareCents,
          category: data.category,
          description: data.description ? `${data.description.trim()} (My Share)` : "My Share",
          txn_date: data.txn_date,
        });

        // 2. Create Transaction 2 (Roommate Share)
        await api.transactions.create({
          account_id: data.account_id,
          type: "expense",
          amount_cents: roommateShareCents,
          category: "Owed to Me",
          description: data.description ? `${data.description.trim()} (Roommate Share)` : "Roommate Share",
          txn_date: data.txn_date,
        });
      } else {
        // Standard single transaction logging
        await api.transactions.create({
          account_id: data.account_id,
          type: data.type,
          amount_cents: totalAmountCents,
          category: data.category,
          description: data.description?.trim() || undefined,
          txn_date: data.txn_date,
        });
      }

      // Refresh data across the app
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["budget"] });

      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to create transaction.";
      setError("root", { message });
    }
  };

  if (!isOpen) return null;

  // Register amount with ref forwarding for auto-focus
  const { ref: amountRegRef, ...amountRegRest } = register("amount");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            Add Transaction
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">
          {/* Root error */}
          {errors.root && (
            <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg text-sm">
              {errors.root.message}
            </div>
          )}

          {/* Type Toggle */}
          <div>
            <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-raised rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setValue("type", "expense")}
                className={`py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                  selectedType === "expense"
                    ? "bg-danger/15 text-danger shadow-sm border border-danger/20"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setValue("type", "income")}
                className={`py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                  selectedType === "income"
                    ? "bg-success/15 text-success shadow-sm border border-success/20"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Income
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="txn-amount"
              className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2"
            >
              Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-mono text-lg">
                ₹
              </span>
              <input
                id="txn-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                {...amountRegRest}
                ref={(e) => {
                  amountRegRef(e);
                  amountRef.current = e;
                }}
                className="w-full pl-9 pr-4 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary font-mono text-lg placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-xs text-danger">{errors.amount.message}</p>
            )}
          </div>

          {/* Split Bill UI Toggle */}
          {selectedType === "expense" && (
            <div className="bg-surface-raised/40 p-3.5 rounded-xl border border-border/60 space-y-3 font-mono">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSplitEnabled}
                  onChange={(e) => setIsSplitEnabled(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent bg-background"
                />
                <span className="text-[10px] font-semibold text-text-primary uppercase tracking-wider font-sans">
                  Split this bill?
                </span>
              </label>

              {isSplitEnabled && (
                <div className="grid grid-cols-2 gap-4 items-center animate-in fade-in slide-in-from-top-2 duration-150">
                  <div>
                    <label htmlFor="split-count" className="block text-[9px] font-medium text-text-muted uppercase tracking-wider mb-1 font-sans">
                      Split Between
                    </label>
                    <input
                      id="split-count"
                      type="number"
                      min="2"
                      max="10"
                      value={splitCount}
                      onChange={(e) => setSplitCount(Math.max(2, parseInt(e.target.value) || 2))}
                      className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-text-primary text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                    />
                  </div>
                  <div className="text-right text-[10px] text-text-secondary leading-normal">
                    <div>Your Share: <span className="text-text-primary font-bold">₹{myShare}</span></div>
                    <div>Owed to Me: <span className="text-accent font-bold">₹{roommateShare}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Account Dropdown */}
          <div>
            <label
              htmlFor="txn-account"
              className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2"
            >
              Account
            </label>
            <select
              id="txn-account"
              {...register("account_id")}
              className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all appearance-none cursor-pointer"
            >
              <option value="" className="text-text-muted">
                Select an account
              </option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({ACCOUNT_TYPES[acc.type as AccountType] || acc.type})
                </option>
              ))}
            </select>
            {errors.account_id && (
              <p className="mt-1 text-xs text-danger">
                {errors.account_id.message}
              </p>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="txn-category"
                className="block text-xs font-medium text-text-muted uppercase tracking-wider"
              >
                Category
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCategory(!isAddingCategory)}
                className="text-xs text-accent hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                {isAddingCategory ? "Select Existing" : "Add Custom"}
              </button>
            </div>

            {isAddingCategory ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Pet Care, Subscriptions"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomCategory();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 bg-surface-raised border border-accent rounded-lg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddCustomCategory}
                  className="px-3 py-2 bg-accent text-text-primary rounded-lg text-xs font-semibold hover:bg-accent/90 transition-all"
                >
                  Save
                </button>
              </div>
            ) : (
              <select
                id="txn-category"
                {...register("category")}
                className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all appearance-none cursor-pointer"
              >
                <option value="" className="text-text-muted">
                  Select a category
                </option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            {errors.category && !isAddingCategory && (
              <p className="mt-1 text-xs text-danger">
                {errors.category.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="txn-description"
              className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2"
            >
              Description{" "}
              <span className="text-text-muted/50 normal-case">(optional)</span>
            </label>
            <input
              id="txn-description"
              type="text"
              placeholder="e.g. Lunch at restaurant"
              {...register("description")}
              className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
            />
          </div>

          {/* Date Picker */}
          <div>
            <label
              htmlFor="txn-date"
              className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2"
            >
              Date
            </label>
            <input
              id="txn-date"
              type="date"
              {...register("txn_date")}
              className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
            />
            {errors.txn_date && (
              <p className="mt-1 text-xs text-danger">
                {errors.txn_date.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded-lg border border-border transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] ${
                selectedType === "income"
                  ? "bg-success hover:bg-success/90 text-white shadow-success/20"
                  : "bg-accent hover:bg-accent/90 text-text-primary shadow-accent/20"
              }`}
            >
              {isSubmitting
                ? "Saving..."
                : selectedType === "income"
                ? "Add Income"
                : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
