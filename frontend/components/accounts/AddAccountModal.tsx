"use client";

import React, { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import { ACCOUNT_TYPES } from "../../lib/constants";
import type { AccountType } from "../../lib/constants";

const addAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.enum(["savings", "current", "credit_card"]),
  opening_balance: z
    .string()
    .min(1, "Opening balance is required")
    .refine((val) => !isNaN(Number(val)), {
      message: "Opening balance must be a valid number",
    }),
  currency: z.string().min(1, "Currency is required"),
  account_number: z.string().optional(),
});

type AddAccountForm = z.infer<typeof addAccountSchema>;

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddAccountModal({ isOpen, onClose }: AddAccountModalProps) {
  const queryClient = useQueryClient();
  const nameRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<AddAccountForm>({
    resolver: zodResolver(addAccountSchema),
    defaultValues: {
      name: "",
      type: "savings",
      opening_balance: "0",
      currency: "INR",
      account_number: "",
    },
  });

  // Focus name field on open
  useEffect(() => {
    if (isOpen) {
      reset({
        name: "",
        type: "savings",
        opening_balance: "0",
        currency: "INR",
        account_number: "",
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

  const onSubmit = async (data: AddAccountForm) => {
    try {
      // Convert rupees to cents (as integer, never float)
      const balanceCents = Math.round(Number(data.opening_balance) * 100);

      await api.accounts.create({
        name: data.name.trim(),
        type: data.type,
        opening_balance: balanceCents,
        currency: data.currency,
        account_number: data.account_number?.trim() || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to create account.";
      setError("root", { message });
    }
  };

  if (!isOpen) return null;

  const { ref: nameRegRef, ...nameRegRest } = register("name");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal container */}
      <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Add Account</h2>
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

          {/* Account Name */}
          <div>
            <label htmlFor="acc-name" className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Account Name
            </label>
            <input
              id="acc-name"
              type="text"
              placeholder="e.g. HDFC Savings"
              {...nameRegRest}
              ref={(e) => {
                nameRegRef(e);
                nameRef.current = e;
              }}
              className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
            />
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
          </div>

          {/* Account Type */}
          <div>
            <label htmlFor="acc-type" className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Account Type
            </label>
            <select
              id="acc-type"
              {...register("type")}
              className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all appearance-none cursor-pointer"
            >
              {Object.entries(ACCOUNT_TYPES).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
            {errors.type && <p className="mt-1 text-xs text-danger">{errors.type.message}</p>}
          </div>

          {/* Opening Balance */}
          <div>
            <label htmlFor="acc-bal" className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Opening Balance (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-mono">₹</span>
              <input
                id="acc-bal"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("opening_balance")}
                className="w-full pl-9 pr-4 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary font-mono text-sm placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
              />
            </div>
            {errors.opening_balance && (
              <p className="mt-1 text-xs text-danger">{errors.opening_balance.message}</p>
            )}
          </div>

          {/* Account Number (Optional) */}
          <div>
            <label htmlFor="acc-num" className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Account Number <span className="text-text-muted/50 normal-case">(optional)</span>
            </label>
            <input
              id="acc-num"
              type="text"
              placeholder="e.g. 50100234857"
              {...register("account_number")}
              className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
            />
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
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-text-primary bg-accent hover:bg-accent/90 transition-all duration-200 shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
            >
              {isSubmitting ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
