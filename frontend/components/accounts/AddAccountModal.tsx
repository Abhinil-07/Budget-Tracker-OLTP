"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Wallet, 
  CreditCard, 
  Building2, 
  AlertCircle, 
  Check, 
  Sparkles,
  ShieldCheck 
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import CardThemeSelector from "./CardThemeSelector";
import { formatAccountNumberWithTheme, setAccountTheme } from "../../lib/cardThemes";

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
    watch,
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

  const selectedType = watch("type");
  const [selectedThemeId, setSelectedThemeId] = useState<string>("sage");

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
      setSelectedThemeId("sage");
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

      const created = await api.accounts.create({
        name: data.name.trim(),
        type: data.type,
        opening_balance: balanceCents,
        currency: data.currency,
        account_number: formatAccountNumberWithTheme(
          data.account_number?.trim(),
          selectedThemeId
        ) || undefined,
      });

      if (created?.data?.id) {
        setAccountTheme(created.data.id, selectedThemeId);
      }

      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="relative w-full max-w-md bg-[#0D0D12] border border-white/10 rounded-[32px] p-6 sm:p-7 shadow-[0_24px_70px_rgba(0,0,0,0.85)] z-10 overflow-hidden"
      >
        {/* Ambient atmospheric corner glow matching the card designs */}
        <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full pointer-events-none blur-3xl opacity-25 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
        <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full pointer-events-none blur-3xl opacity-20 bg-gradient-to-tr from-cyan-500 to-emerald-500" />

        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/[0.08] relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-neutral-300 uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Digital Card Setup</span>
            </div>
            <h3 className="text-xl font-extrabold text-white tracking-tight">Add Account</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Connect a bank or credit card to track balances in real-time.
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
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4 relative z-10">
          {errors.root && (
            <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 px-3.5 py-2.5 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errors.root.message}</span>
            </div>
          )}

          {/* Account Type Selector (Segmented 3-Pill Interactive Grid) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
              Account Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setValue("type", "savings")}
                className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  selectedType === "savings"
                    ? "bg-white text-black border-white shadow-lg font-bold scale-[1.02]"
                    : "bg-[#141418] border-white/[0.08] text-neutral-400 hover:text-white hover:bg-[#1A1A22]"
                }`}
              >
                <Wallet className="h-4 w-4" />
                <span className="text-xs">Savings</span>
              </button>

              <button
                type="button"
                onClick={() => setValue("type", "credit_card")}
                className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  selectedType === "credit_card"
                    ? "bg-white text-black border-white shadow-lg font-bold scale-[1.02]"
                    : "bg-[#141418] border-white/[0.08] text-neutral-400 hover:text-white hover:bg-[#1A1A22]"
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span className="text-xs">Credit Card</span>
              </button>

              <button
                type="button"
                onClick={() => setValue("type", "current")}
                className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  selectedType === "current"
                    ? "bg-white text-black border-white shadow-lg font-bold scale-[1.02]"
                    : "bg-[#141418] border-white/[0.08] text-neutral-400 hover:text-white hover:bg-[#1A1A22]"
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span className="text-xs">Current</span>
              </button>
            </div>
            {errors.type && <p className="mt-1 text-xs text-rose-400">{errors.type.message}</p>}
          </div>

          {/* Account Name */}
          <div>
            <label htmlFor="acc-name" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Account Name
            </label>
            <input
              id="acc-name"
              type="text"
              placeholder="e.g. HDFC Salary, Slice Platinum"
              {...nameRegRest}
              ref={(e) => {
                nameRegRef(e);
                nameRef.current = e;
              }}
              className="w-full bg-[#14141A] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/30 transition-all font-medium"
            />
            {errors.name && <p className="mt-1 text-xs text-rose-400">{errors.name.message}</p>}
          </div>

          {/* Opening Balance / Amount Owed */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="acc-bal" className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                {selectedType === "credit_card" ? "Amount Owed (₹)" : "Opening Balance (₹)"}
              </label>
              {selectedType === "credit_card" && (
                <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Liability (Debt)
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-base font-semibold">
                ₹
              </span>
              <input
                id="acc-bal"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("opening_balance")}
                className="w-full pl-9 pr-4 py-3 bg-[#14141A] border border-white/10 rounded-2xl text-white font-mono text-base placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/30 transition-all font-medium"
              />
            </div>
            {errors.opening_balance && (
              <p className="mt-1 text-xs text-rose-400">{errors.opening_balance.message}</p>
            )}
          </div>

          {/* Account Number (Optional) */}
          <div>
            <label htmlFor="acc-num" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Account / Card Number <span className="text-neutral-500 normal-case font-normal">(optional)</span>
            </label>
            <input
              id="acc-num"
              type="text"
              placeholder="e.g. 50100234857 or last 4 digits (8421)"
              {...register("account_number")}
              className="w-full bg-[#14141A] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/30 transition-all font-mono"
            />
          </div>

          {/* Card Color Theme Picker */}
          <CardThemeSelector
            selectedThemeId={selectedThemeId}
            onSelectTheme={setSelectedThemeId}
          />

          {/* Action Buttons Row */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-full text-xs font-semibold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-full text-xs font-bold text-black bg-white hover:bg-neutral-100 transition-all shadow-xl shadow-white/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
