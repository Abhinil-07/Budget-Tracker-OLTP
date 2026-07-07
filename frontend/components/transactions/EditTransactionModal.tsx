"use client";

import React, { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import { useAccounts } from "../../hooks/useAccounts";
import { CATEGORIES, ACCOUNT_TYPES } from "../../lib/constants";
import type { AccountType } from "../../lib/constants";
import { Transaction } from "../../types/transaction";

const editTransactionSchema = z.object({
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

type EditTransactionForm = z.infer<typeof editTransactionSchema>;

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export default function EditTransactionModal({
  isOpen,
  onClose,
  transaction,
}: EditTransactionModalProps) {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useAccounts();
  const amountRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<EditTransactionForm>({
    resolver: zodResolver(editTransactionSchema),
    defaultValues: {
      amount: "",
      type: "expense",
      account_id: "",
      category: "",
      description: "",
      txn_date: "",
    },
  });

  const selectedType = watch("type");

  // Populate form when transaction changes
  useEffect(() => {
    if (isOpen && transaction) {
      reset({
        amount: (transaction.amount_cents / 100).toFixed(2),
        type: transaction.type,
        account_id: transaction.account_id,
        category: transaction.category,
        description: transaction.description || "",
        txn_date: transaction.txn_date,
      });

      // Small delay to let the DOM render before focusing
      const timer = setTimeout(() => {
        amountRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, transaction, reset]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const onSubmit = async (data: EditTransactionForm) => {
    if (!transaction) return;

    try {
      // Convert rupees to cents (integer, never float)
      const amountCents = Math.round(Number(data.amount) * 100);

      await api.transactions.update(transaction.id, {
        account_id: data.account_id,
        type: data.type,
        amount_cents: amountCents,
        category: data.category as typeof CATEGORIES[number],
        description: data.description?.trim() || "",
        txn_date: data.txn_date,
      });

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
          : "Failed to update transaction.";
      setError("root", { message });
    }
  };

  if (!isOpen || !transaction) return null;

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
            Edit Transaction
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
              htmlFor="edit-txn-amount"
              className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2"
            >
              Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-mono text-lg">
                ₹
              </span>
              <input
                id="edit-txn-amount"
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

          {/* Account Dropdown */}
          <div>
            <label
              htmlFor="edit-txn-account"
              className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2"
            >
              Account
            </label>
            <select
              id="edit-txn-account"
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
            <label
              htmlFor="edit-txn-category"
              className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2"
            >
              Category
            </label>
            <select
              id="edit-txn-category"
              {...register("category")}
              className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all appearance-none cursor-pointer"
            >
              <option value="" className="text-text-muted">
                Select a category
              </option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-xs text-danger">
                {errors.category.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="edit-txn-description"
              className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2"
            >
              Description{" "}
              <span className="text-text-muted/50 normal-case">(optional)</span>
            </label>
            <input
              id="edit-txn-description"
              type="text"
              placeholder="e.g. Lunch at restaurant"
              {...register("description")}
              className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
            />
          </div>

          {/* Date Picker */}
          <div>
            <label
              htmlFor="edit-txn-date"
              className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2"
            >
              Date
            </label>
            <input
              id="edit-txn-date"
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
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
