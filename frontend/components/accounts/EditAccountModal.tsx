"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Check, AlertCircle, ShieldAlert } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Account } from "../../types/account";
import { api, ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/formatCurrency";
import { ACCOUNT_TYPES } from "../../lib/constants";
import type { AccountType } from "../../lib/constants";
import CardThemeSelector from "./CardThemeSelector";
import {
  getAccountTheme,
  setAccountTheme,
  formatAccountNumberWithTheme,
} from "../../lib/cardThemes";

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  hasTransactions: boolean;
}

export default function EditAccountModal({
  isOpen,
  onClose,
  account,
  hasTransactions,
}: EditAccountModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [balanceStr, setBalanceStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedThemeId, setSelectedThemeId] = useState<string>("sage");

  useEffect(() => {
    if (account && isOpen) {
      setName(account.name);
      setBalanceStr((account.balance_cents / 100).toFixed(2));
      setSelectedThemeId(getAccountTheme(account).id);
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [account, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !account) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Account name cannot be empty.");
      return;
    }
    const balNum = parseFloat(balanceStr);
    if (isNaN(balNum)) {
      setError("Please enter a valid numeric balance.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const balanceCents = Math.round(balNum * 100);

      // Persist theme to local device storage and format with account_number for cloud sync
      setAccountTheme(account.id, selectedThemeId);
      const updatedAccountNumber = formatAccountNumberWithTheme(account.account_number, selectedThemeId);

      const res = await api.accounts.update(account.id, {
        name: name.trim(),
        balance_cents: balanceCents,
        account_number: updatedAccountNumber || undefined,
      });
      if (res.error) throw new Error(res.error.message);

      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to update account.";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await api.accounts.delete(account.id);
      if (res.error) throw new Error(res.error.message);

      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Cannot delete account with existing transactions.";
      setError(msg);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

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

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="relative w-full max-w-md bg-[#0D0D12] border border-white/10 rounded-[32px] p-6 sm:p-7 shadow-[0_24px_70px_rgba(0,0,0,0.85)] z-10 overflow-hidden"
      >
        {/* Ambient atmospheric corner glow */}
        <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full pointer-events-none blur-3xl opacity-25 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
        <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full pointer-events-none blur-3xl opacity-20 bg-gradient-to-tr from-cyan-500 to-emerald-500" />

        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/[0.08] relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-neutral-300 uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>{ACCOUNT_TYPES[account.type as AccountType] || account.type}</span>
            </div>
            <h3 className="text-xl font-extrabold text-white tracking-tight">Card Settings</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Update balance or manage card configuration.
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

        {error && (
          <div className="mt-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 px-3.5 py-2.5 rounded-2xl text-xs flex items-center gap-2 relative z-10">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-4 relative z-10">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Card / Account Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#14141A] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/30 transition-all font-medium"
              placeholder="e.g. HDFC Salary"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                {account.type === "credit_card" ? "Amount Owed (₹)" : "Current Balance (₹)"}
              </label>
              {account.type === "credit_card" && (
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
                type="number"
                step="0.01"
                value={balanceStr}
                onChange={(e) => setBalanceStr(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-[#14141A] border border-white/10 rounded-2xl text-white font-mono text-base placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/30 transition-all font-medium"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="bg-[#14141A] border border-white/[0.08] rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-medium">Account / Card Number</span>
            <span className="text-white font-mono font-bold tracking-wider">
              {account.account_number ? `•••• ${account.account_number.slice(-4)}` : "Not Provided"}
            </span>
          </div>

          {/* Card Color Theme Picker */}
          <CardThemeSelector
            selectedThemeId={selectedThemeId}
            onSelectTheme={setSelectedThemeId}
          />

          {/* Delete section or confirmation */}
          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between pt-3">
              {hasTransactions ? (
                <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Locked (has transactions)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 py-1.5 px-3 rounded-full hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              )}

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-black bg-white hover:bg-neutral-100 transition-all shadow-xl shadow-white/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-3">
              <p className="text-xs text-rose-300 font-medium">
                Are you sure you want to permanently delete this card?
              </p>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-neutral-300 hover:text-white bg-white/10 border border-white/15"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-full text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all disabled:opacity-50 shadow-md"
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}
