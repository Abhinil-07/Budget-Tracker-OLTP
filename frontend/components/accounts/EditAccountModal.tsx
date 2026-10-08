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

  useEffect(() => {
    if (account && isOpen) {
      setName(account.name);
      setBalanceStr((account.balance_cents / 100).toFixed(2));
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
      const res = await api.accounts.update(account.id, {
        name: name.trim(),
        balance_cents: balanceCents,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="relative w-full max-w-md bg-[#121216] border border-white/[0.09] rounded-3xl p-6 sm:p-7 shadow-2xl z-10 overflow-hidden select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.07]">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block mb-0.5">
              {ACCOUNT_TYPES[account.type as AccountType] || account.type}
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight">Card Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
              Card / Account Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#18181D] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white transition-all font-medium"
              placeholder="e.g. HDFC Salary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
              {account.type === "credit_card" ? "Amount Owed (₹)" : "Current Balance (₹)"}
            </label>
            <input
              type="number"
              step="0.01"
              value={balanceStr}
              onChange={(e) => setBalanceStr(e.target.value)}
              className="w-full bg-[#18181D] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white transition-all font-mono"
              placeholder="0.00"
            />
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-mono">Account Number</span>
            <span className="text-neutral-200 font-mono font-semibold">
              {account.account_number ? `•••• ${account.account_number.slice(-4)}` : "Not Provided"}
            </span>
          </div>

          {/* Delete section or confirmation */}
          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between pt-2">
              {hasTransactions ? (
                <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Card locked (has transactions)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Card</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-black bg-white hover:bg-neutral-100 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-3">
              <p className="text-xs text-rose-300 font-medium">
                Are you sure you want to permanently delete this card?
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all disabled:opacity-50 shadow-md"
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
