"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import { useAccounts } from "../../hooks/useAccounts";
import { useCategories } from "../../hooks/useCategories";
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
  is_included: z.boolean(),
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
      is_included: true,
    },
  });

  const selectedType = watch("type");

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
        is_included: transaction.is_included !== false,
      });
      setIsAddingCategory(false);
      setNewCategoryName("");

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
        category: data.category,
        description: data.description?.trim() || "",
        txn_date: data.txn_date,
        is_included: data.is_included,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#0D0D12] border border-white/10 rounded-[32px] shadow-[0_24px_70px_rgba(0,0,0,0.85)] w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden z-10">
        {/* Ambient atmospheric corner glow */}
        <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full pointer-events-none blur-3xl opacity-25 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
        <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full pointer-events-none blur-3xl opacity-20 bg-gradient-to-tr from-cyan-500 to-emerald-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] shrink-0 relative z-10">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Edit Transaction
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">Modify amount, account, or category details.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4 overflow-y-auto flex-1 relative z-10">
          {/* Root error */}
          {errors.root && (
            <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 px-3.5 py-2.5 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errors.root.message}</span>
            </div>
          )}

          {/* Type Toggle */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#141418] rounded-2xl border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setValue("type", "expense")}
                className={`py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  selectedType === "expense"
                    ? "bg-white text-black shadow-md"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setValue("type", "income")}
                className={`py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  selectedType === "income"
                    ? "bg-white text-black shadow-md"
                    : "text-neutral-400 hover:text-white"
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
              className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5"
            >
              Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-base font-semibold">
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
                className="w-full pl-9 pr-4 py-2.5 bg-[#14141A] border border-white/10 rounded-2xl text-white font-mono text-base placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all"
              />
            </div>
            {errors.amount && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.amount.message}</p>
            )}
          </div>

          {/* Account Dropdown */}
          <div>
            <label
              htmlFor="edit-txn-account"
              className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5"
            >
              Account
            </label>
            <div className="relative">
              <select
                id="edit-txn-account"
                {...register("account_id")}
                className="w-full px-4 py-2.5 bg-[#14141A] border border-white/10 rounded-2xl text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#14141A] text-neutral-400">
                  Select an account
                </option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-[#14141A] text-white">
                    {acc.name} ({ACCOUNT_TYPES[acc.type as AccountType] || acc.type})
                  </option>
                ))}
              </select>
            </div>
            {errors.account_id && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium">
                {errors.account_id.message}
              </p>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="edit-txn-category"
                className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400"
              >
                Category
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCategory(!isAddingCategory)}
                className="text-[11px] text-neutral-300 hover:text-white flex items-center gap-1 font-semibold cursor-pointer transition-colors"
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
                  className="flex-1 px-4 py-2.5 bg-[#14141A] border border-white/20 rounded-2xl text-white text-xs placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddCustomCategory}
                  className="px-4 py-2.5 bg-white text-black font-bold rounded-full text-xs hover:bg-neutral-100 transition-all cursor-pointer active:scale-95"
                >
                  Save
                </button>
              </div>
            ) : (
              <select
                id="edit-txn-category"
                {...register("category")}
                className="w-full px-4 py-2.5 bg-[#14141A] border border-white/10 rounded-2xl text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#14141A] text-neutral-400">
                  Select a category
                </option>
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#14141A] text-white">
                    {cat}
                  </option>
                ))}
              </select>
            )}

            {errors.category && !isAddingCategory && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium">
                {errors.category.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="edit-txn-description"
              className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5"
            >
              Description{" "}
              <span className="text-neutral-500 normal-case font-normal">(optional)</span>
            </label>
            <input
              id="edit-txn-description"
              type="text"
              placeholder="e.g. Lunch at restaurant"
              {...register("description")}
              className="w-full px-4 py-2.5 bg-[#14141A] border border-white/10 rounded-2xl text-white text-xs placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all"
            />
          </div>

          {/* Date Picker */}
          <div>
            <label
              htmlFor="edit-txn-date"
              className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5"
            >
              Date
            </label>
            <input
              id="edit-txn-date"
              type="date"
              {...register("txn_date")}
              className="w-full px-4 py-2.5 bg-[#14141A] border border-white/10 rounded-2xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all"
            />
            {errors.txn_date && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium">
                {errors.txn_date.message}
              </p>
            )}
          </div>

          {/* To Be Included in Expense Total Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#141418] border border-white/[0.08]">
            <div className="space-y-0.5 pr-2">
              <label
                htmlFor="edit-txn-is-included"
                className="text-xs font-bold text-white block cursor-pointer"
              >
                Include in Expense Total
              </label>
              <p className="text-[11px] text-neutral-400 leading-tight">
                When enabled, this transaction counts toward your dashboard expense metrics.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                id="edit-txn-is-included"
                type="checkbox"
                {...register("is_included")}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white"></div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full text-xs font-bold text-black bg-white hover:bg-neutral-100 shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
