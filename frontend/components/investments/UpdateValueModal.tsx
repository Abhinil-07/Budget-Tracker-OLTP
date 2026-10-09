"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import { Investment } from "../../types/investment";

const updateValueSchema = z.object({
  invested_amount: z.string().min(1, "Invested amount is required").refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Amount must be a positive number",
  }),
  current_value: z.string().min(1, "Current value is required").refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Current value must be a positive number",
  }),
});

type UpdateValueForm = z.infer<typeof updateValueSchema>;

interface UpdateValueModalProps {
  isOpen: boolean;
  onClose: () => void;
  investment: Investment | null;
}

export default function UpdateValueModal({
  isOpen,
  onClose,
  investment,
}: UpdateValueModalProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<UpdateValueForm>({
    resolver: zodResolver(updateValueSchema),
    defaultValues: {
      invested_amount: "",
      current_value: "",
    },
  });

  // Prefill values when modal opens or investment changes
  useEffect(() => {
    if (isOpen && investment) {
      reset({
        invested_amount: String(investment.invested_amount_cents / 100),
        current_value: String(investment.current_value_cents / 100),
      });
    }
  }, [isOpen, investment, reset]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !investment) return null;

  const onSubmit = async (data: UpdateValueForm) => {
    try {
      const investedAmountCents = Math.round(Number(data.invested_amount) * 100);
      const currentValueCents = Math.round(Number(data.current_value) * 100);

      await api.investments.updateValue(investment.id, {
        invested_amount_cents: investedAmountCents,
        current_value_cents: currentValueCents,
      });

      queryClient.invalidateQueries({ queryKey: ["investments"] });
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to update investment values.";
      setError("root", { message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-[#0D0D12] border border-white/10 rounded-[32px] shadow-[0_24px_70px_rgba(0,0,0,0.85)] w-full max-w-sm mx-4 animate-in fade-in duration-200 z-10 overflow-hidden">
        {/* Atmospheric ambient lighting */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full pointer-events-none blur-3xl opacity-25 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full pointer-events-none blur-3xl opacity-20 bg-gradient-to-tr from-cyan-500 to-emerald-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] relative z-10">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Update Portfolio Value</h2>
            <p className="text-[11px] text-neutral-400 mt-0.5 font-medium truncate max-w-[200px]">
              {investment.name}
            </p>
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
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4 relative z-10">
          {errors.root && (
            <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 px-3.5 py-2.5 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errors.root.message}</span>
            </div>
          )}

          {/* Invested Amount */}
          <div>
            <label htmlFor="edit-invested" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Invested Capital (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-base font-semibold">
                ₹
              </span>
              <input
                id="edit-invested"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("invested_amount")}
                className="w-full pl-9 pr-4 py-2.5 bg-[#14141A] border border-white/10 rounded-2xl text-white font-mono text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all"
              />
            </div>
            {errors.invested_amount && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.invested_amount.message}</p>
            )}
            <p className="text-[10px] text-neutral-400 mt-1 leading-relaxed">
              Adjust this value to add new SIP contributions or purchases.
            </p>
          </div>

          {/* Current Value */}
          <div>
            <label htmlFor="edit-current" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Current Market Value (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-base font-semibold">
                ₹
              </span>
              <input
                id="edit-current"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("current_value")}
                className="w-full pl-9 pr-4 py-2.5 bg-[#14141A] border border-white/10 rounded-2xl text-white font-mono text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all"
              />
            </div>
            {errors.current_value && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.current_value.message}</p>
            )}
            <p className="text-[10px] text-neutral-400 mt-1 leading-relaxed">
              Reflect the latest Net Asset Value (NAV) or valuation.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
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
