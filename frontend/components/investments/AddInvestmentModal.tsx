"use client";

import React, { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import { InvestmentType } from "../../types/investment";

const addInvestmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum(["fixed_deposit", "stock", "mutual_fund", "ppf"]),
  invested_amount: z.string().min(1, "Invested amount is required").refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Amount must be a positive number",
  }),
  current_value: z.string().min(1, "Current value is required").refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Current value must be a positive number",
  }),
  interest_rate: z.string().optional().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100), {
    message: "Interest rate must be between 0 and 100",
  }),
  maturity_date: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

type AddInvestmentForm = z.infer<typeof addInvestmentSchema>;

interface AddInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INVESTMENT_TYPES = [
  { value: "mutual_fund", label: "Mutual Funds" },
  { value: "stock", label: "Stocks" },
  { value: "fixed_deposit", label: "Fixed Deposit (FD)" },
  { value: "ppf", label: "Public Provident Fund (PPF)" },
];

export default function AddInvestmentModal({
  isOpen,
  onClose,
}: AddInvestmentModalProps) {
  const queryClient = useQueryClient();
  const nameRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<AddInvestmentForm>({
    resolver: zodResolver(addInvestmentSchema),
    defaultValues: {
      name: "",
      type: "mutual_fund",
      invested_amount: "",
      current_value: "",
      interest_rate: "",
      maturity_date: "",
      notes: "",
    },
  });

  const selectedType = watch("type");
  const watchedInvestedAmount = watch("invested_amount");

  // Autofill Current Value with Invested Amount if it's empty
  useEffect(() => {
    if (watchedInvestedAmount) {
      setValue("current_value", watchedInvestedAmount);
    }
  }, [watchedInvestedAmount, setValue]);

  // Set default interest rate for PPF (7.1%) as convenience
  useEffect(() => {
    if (selectedType === "ppf") {
      setValue("interest_rate", "7.1");
    } else {
      setValue("interest_rate", "");
    }
  }, [selectedType, setValue]);

  // Focus name field on open
  useEffect(() => {
    if (isOpen) {
      reset({
        name: "",
        type: "mutual_fund",
        invested_amount: "",
        current_value: "",
        interest_rate: "",
        maturity_date: "",
        notes: "",
      });
      const timer = setTimeout(() => {
        nameRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, reset]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const onSubmit = async (data: AddInvestmentForm) => {
    try {
      // Convert rupees to cents
      const investedAmountCents = Math.round(Number(data.invested_amount) * 100);
      const currentValueCents = Math.round(Number(data.current_value) * 100);
      const interestRate = data.interest_rate ? Number(data.interest_rate) : null;
      const maturityDate = data.maturity_date && selectedType === "fixed_deposit" ? data.maturity_date : null;

      await api.investments.create({
        name: data.name.trim(),
        type: data.type as InvestmentType,
        invested_amount_cents: investedAmountCents,
        current_value_cents: currentValueCents,
        interest_rate: interestRate,
        maturity_date: maturityDate || undefined,
        notes: data.notes?.trim() || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ["investments"] });
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to create investment.";
      setError("root", { message });
    }
  };

  if (!isOpen) return null;

  const { ref: nameRegRef, ...nameRegRest } = register("name");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in duration-200 z-10 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-text-primary">Add Investment</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {errors.root && (
            <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg text-sm">
              {errors.root.message}
            </div>
          )}

          {/* Investment Name */}
          <div>
            <label htmlFor="inv-name" className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Investment Name / Category
            </label>
            <input
              id="inv-name"
              type="text"
              placeholder="e.g. My Mutual Funds, SBI FD 2026"
              {...nameRegRest}
              ref={(e) => {
                nameRegRef(e);
                nameRef.current = e;
              }}
              className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-danger">{errors.name.message}</p>
            )}
          </div>

          {/* Investment Type */}
          <div>
            <label htmlFor="inv-type" className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Investment Type
            </label>
            <select
              id="inv-type"
              {...register("type")}
              className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all cursor-pointer"
            >
              {INVESTMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="mt-1 text-xs text-danger">{errors.type.message}</p>
            )}
          </div>

          {/* Two Column Row: Invested vs Current */}
          <div className="grid grid-cols-2 gap-4">
            {/* Invested Amount */}
            <div>
              <label htmlFor="inv-amount" className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                Invested (₹)
              </label>
              <input
                id="inv-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("invested_amount")}
                className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
              />
              {errors.invested_amount && (
                <p className="mt-1 text-xs text-danger">{errors.invested_amount.message}</p>
              )}
            </div>

            {/* Current Value */}
            <div>
              <label htmlFor="inv-current" className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                Current Value (₹)
              </label>
              <input
                id="inv-current"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("current_value")}
                className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
              />
              {errors.current_value && (
                <p className="mt-1 text-xs text-danger">{errors.current_value.message}</p>
              )}
            </div>
          </div>

          {/* Conditional: Interest Rate (FD or PPF) */}
          {(selectedType === "fixed_deposit" || selectedType === "ppf") && (
            <div>
              <label htmlFor="inv-rate" className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                Interest Rate (%)
              </label>
              <input
                id="inv-rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g. 7.10"
                {...register("interest_rate")}
                className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
              />
              {errors.interest_rate && (
                <p className="mt-1 text-xs text-danger">{errors.interest_rate.message}</p>
              )}
            </div>
          )}

          {/* Conditional: Maturity Date (FD only) */}
          {selectedType === "fixed_deposit" && (
            <div>
              <label htmlFor="inv-maturity" className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                Maturity Date
              </label>
              <input
                id="inv-maturity"
                type="date"
                {...register("maturity_date")}
                className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all cursor-pointer"
              />
              {errors.maturity_date && (
                <p className="mt-1 text-xs text-danger">{errors.maturity_date.message}</p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="inv-notes" className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Notes / Description (optional)
            </label>
            <textarea
              id="inv-notes"
              rows={3}
              placeholder="Add details about lock-in period, specific stocks/mutual funds holding list, etc."
              {...register("notes")}
              className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all resize-none"
            />
            {errors.notes && (
              <p className="mt-1 text-xs text-danger">{errors.notes.message}</p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-success text-white text-xs font-semibold rounded-lg hover:bg-success/90 disabled:opacity-50 transition-all shadow-md shadow-success/10"
            >
              {isSubmitting ? "Adding..." : "Add Investment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
