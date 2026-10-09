"use client";

import React, { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, TrendingUp, BarChart3, Landmark, ShieldCheck, AlertCircle } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-[#0D0D12] border border-white/10 rounded-[32px] shadow-[0_24px_70px_rgba(0,0,0,0.85)] w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden z-10 animate-in fade-in duration-200">
        {/* Ambient atmospheric glows */}
        <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full pointer-events-none blur-3xl opacity-25 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
        <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full pointer-events-none blur-3xl opacity-20 bg-gradient-to-tr from-cyan-500 to-emerald-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] shrink-0 relative z-10">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Add Investment</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Track your mutual funds, stocks, FDs, and PPF.</p>
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

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4 overflow-y-auto flex-1 relative z-10">
          {errors.root && (
            <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 px-3.5 py-2.5 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errors.root.message}</span>
            </div>
          )}

          {/* Investment Name */}
          <div>
            <label htmlFor="inv-name" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Investment Name
            </label>
            <input
              id="inv-name"
              type="text"
              placeholder="e.g. Parag Parikh Flexi Cap, SBI 3-Yr FD, Nifty 50 ETF"
              {...nameRegRest}
              ref={(e) => {
                nameRegRef(e);
                nameRef.current = e;
              }}
              className="w-full px-4 py-2.5 bg-[#14141A] border border-white/10 rounded-2xl text-white text-xs placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all"
            />
            {errors.name && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.name.message}</p>
            )}
          </div>

          {/* Investment Type - Segmented Pill Grid */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Asset Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#141418] rounded-2xl border border-white/[0.08]">
              {[
                { value: "mutual_fund", label: "Mutual Funds", icon: TrendingUp },
                { value: "stock", label: "Stocks", icon: BarChart3 },
                { value: "fixed_deposit", label: "Fixed Deposit", icon: Landmark },
                { value: "ppf", label: "PPF", icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = selectedType === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setValue("type", item.value as any, { shouldValidate: true })}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-white text-black shadow-md scale-[1.01]"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-black" : "text-neutral-400"}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.type && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.type.message}</p>
            )}
          </div>

          {/* Two Column Row: Invested vs Current */}
          <div className="grid grid-cols-2 gap-3">
            {/* Invested Amount */}
            <div>
              <label htmlFor="inv-amount" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Invested (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-sm">
                  ₹
                </span>
                <input
                  id="inv-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register("invested_amount")}
                  className="w-full pl-8 pr-3 py-2.5 bg-[#14141A] border border-white/10 rounded-2xl text-white font-mono text-xs placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all"
                />
              </div>
              {errors.invested_amount && (
                <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.invested_amount.message}</p>
              )}
            </div>

            {/* Current Value */}
            <div>
              <label htmlFor="inv-current" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Current Value (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-sm">
                  ₹
                </span>
                <input
                  id="inv-current"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register("current_value")}
                  className="w-full pl-8 pr-3 py-2.5 bg-[#14141A] border border-white/10 rounded-2xl text-white font-mono text-xs placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all"
                />
              </div>
              {errors.current_value && (
                <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.current_value.message}</p>
              )}
            </div>
          </div>

          {/* Conditional: Interest Rate (FD or PPF) */}
          {(selectedType === "fixed_deposit" || selectedType === "ppf") && (
            <div>
              <label htmlFor="inv-rate" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
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
                className="w-full px-4 py-2.5 bg-[#14141A] border border-white/10 rounded-2xl text-white font-mono text-xs placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all"
              />
              {errors.interest_rate && (
                <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.interest_rate.message}</p>
              )}
            </div>
          )}

          {/* Conditional: Maturity Date (FD only) */}
          {selectedType === "fixed_deposit" && (
            <div>
              <label htmlFor="inv-maturity" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Maturity Date
              </label>
              <input
                id="inv-maturity"
                type="date"
                {...register("maturity_date")}
                className="w-full px-4 py-2.5 bg-[#14141A] border border-white/10 rounded-2xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all cursor-pointer"
              />
              {errors.maturity_date && (
                <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.maturity_date.message}</p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="inv-notes" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Notes <span className="text-neutral-500 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              id="inv-notes"
              rows={2}
              placeholder="Account number, lock-in duration, or notes..."
              {...register("notes")}
              className="w-full px-4 py-2.5 bg-[#14141A] border border-white/10 rounded-2xl text-white text-xs placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all resize-none"
            />
            {errors.notes && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.notes.message}</p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08] shrink-0">
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
              {isSubmitting ? "Adding..." : "Add Investment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
