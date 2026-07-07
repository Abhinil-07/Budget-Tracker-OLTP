"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-in fade-in duration-200 z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Update Portfolio Value</h2>
            <p className="text-[10px] text-text-secondary mt-0.5 uppercase tracking-wider font-mono font-bold">
              {investment.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">
          {errors.root && (
            <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg text-sm">
              {errors.root.message}
            </div>
          )}

          {/* Invested Amount */}
          <div>
            <label htmlFor="edit-invested" className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Invested Capital (₹)
            </label>
            <input
              id="edit-invested"
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
            <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
              Adjust this value to add new SIP contributions or stock purchases.
            </p>
          </div>

          {/* Current Value */}
          <div>
            <label htmlFor="edit-current" className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Current Market Value (₹)
            </label>
            <input
              id="edit-current"
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
            <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
              Update this to reflect the latest Net Asset Value (NAV) or stock valuation.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
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
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
