"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check, Trash2, Mail, MessageSquare, AlertCircle, Sparkles, CheckCheck, ShieldCheck } from "lucide-react";
import { useStagedTransactions, StagedTransactionItem } from "../../hooks/useStagedTransactions";
import { useAccounts } from "../../hooks/useAccounts";
import { useCategories } from "../../hooks/useCategories";
import { api, ApiError } from "../../lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface StagedInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StagedInboxModal({ isOpen, onClose }: StagedInboxModalProps) {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const { stagedTransactions, updateStagedTransaction, removeStagedTransaction, clearAllStaged } =
    useStagedTransactions();
  const { data: accounts = [] } = useAccounts();
  const { categories } = useCategories();

  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-preselect default account for staged items if not selected yet
  useEffect(() => {
    if (accounts.length > 0) {
      stagedTransactions.forEach((item) => {
        if (!item.account_id) {
          updateStagedTransaction(item.id, { account_id: accounts[0].id });
        }
      });
    }
  }, [accounts, stagedTransactions, updateStagedTransaction]);

  if (!isOpen || !mounted) return null;

  const handleApprove = async (item: StagedTransactionItem) => {
    if (!item.account_id) {
      setError(`Please select an account for "${item.description || 'this transaction'}" before approving.`);
      return;
    }

    setError(null);
    setLoadingIds((prev) => ({ ...prev, [item.id]: true }));

    // 1. INSTANT OPTIMISTIC REMOVAL FROM UI (0ms delay)
    removeStagedTransaction(item.id);

    try {
      // 2. Log transaction & update account balance in DB
      await api.transactions.create({
        account_id: item.account_id,
        type: item.type,
        amount_cents: item.amount_cents,
        category: item.category,
        description: item.description,
        txn_date: item.txn_date,
      });

      // Refetch ledger state in background
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["budget"] });
    } catch (err) {
      console.error("Failed to approve transaction:", err);
      const message = err instanceof ApiError ? err.message : "Failed to save transaction.";
      setError(message);
    } finally {
      setLoadingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleApproveAll = async () => {
    const validItems = stagedTransactions.filter((item) => Boolean(item.account_id));
    if (validItems.length === 0) {
      setError("Please select bank/credit card accounts for your transactions before approving.");
      return;
    }

    setError(null);
    for (const item of validItems) {
      await handleApprove(item);
    }
  };

  const modalUI = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 select-none">
      {/* Modal Container */}
      <div className="relative my-auto mx-auto bg-[#0D0D12] border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.85)] rounded-[32px] w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Atmospheric ambient glows */}
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none blur-3xl opacity-25 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full pointer-events-none blur-3xl opacity-20 bg-gradient-to-tr from-cyan-500 to-emerald-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 border border-white/10 rounded-2xl text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white text-base tracking-tight">Staged Inbox</h2>
                {stagedTransactions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white text-black">
                    {stagedTransactions.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Review and approve auto-parsed SMS & Email transactions before they enter your ledger.
              </p>
            </div>
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 font-sans relative z-10 custom-scrollbar">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-2xl text-xs animate-in slide-in-from-top-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {stagedTransactions.length === 0 ? (
            /* Empty State */
            <div className="py-14 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-white/5 border border-white/10 rounded-full text-neutral-300">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white tracking-tight">Inbox Clean & Clear!</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  No unreviewed transactions pending. Forwarded bank emails and parsed SMS will land here for instant 1-click review.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Batch Action Toolbar */}
              <div className="flex items-center justify-between text-xs font-mono bg-[#141418] p-3 rounded-2xl border border-white/[0.08]">
                <span className="text-neutral-300">
                  <strong className="text-white">{stagedTransactions.length}</strong> pending transaction(s)
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleApproveAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-black hover:bg-neutral-100 transition-all cursor-pointer active:scale-95"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Approve All
                  </button>
                  <span className="text-neutral-700">|</span>
                  <button
                    type="button"
                    onClick={clearAllStaged}
                    className="text-xs text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Discard All
                  </button>
                </div>
              </div>

              {/* Transaction Cards */}
              <div className="space-y-3.5">
                {stagedTransactions.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-[#141418] border border-white/[0.08] hover:border-white/20 rounded-2xl space-y-3.5 transition-all shadow-md group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {item.source === "email" ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20 uppercase font-mono tracking-wider">
                            <Mail className="h-3 w-3" /> Gmail
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 uppercase font-mono tracking-wider">
                            <MessageSquare className="h-3 w-3" /> SMS
                          </span>
                        )}
                        <span className="text-xs text-neutral-400 font-mono">{item.created_at.split("T")[0]}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateStagedTransaction(item.id, {
                            type: item.type === "expense" ? "income" : "expense",
                          })
                        }
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer transition-all font-mono tracking-wider ${
                          item.type === "expense"
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                        }`}
                      >
                        {item.type}
                      </button>
                    </div>

                    {/* Inputs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs font-mono">
                      {/* Account */}
                      <div>
                        <label className="block text-[10px] font-sans font-bold text-neutral-400 uppercase mb-1">
                          Account *
                        </label>
                        <select
                          value={item.account_id}
                          onChange={(e) => updateStagedTransaction(item.id, { account_id: e.target.value })}
                          className="w-full bg-[#14141A] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                        >
                          <option value="" className="bg-[#14141A] text-neutral-400">-- Select Account --</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id} className="bg-[#14141A] text-white">
                              {acc.name} ({acc.type})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-[10px] font-sans font-bold text-neutral-400 uppercase mb-1">
                          Category
                        </label>
                        <select
                          value={item.category}
                          onChange={(e) => updateStagedTransaction(item.id, { category: e.target.value })}
                          className="w-full bg-[#14141A] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c} className="bg-[#14141A] text-white">
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-[10px] font-sans font-bold text-neutral-400 uppercase mb-1">
                          Amount (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={isNaN(item.amount_cents) ? "" : (item.amount_cents / 100).toString()}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            updateStagedTransaction(item.id, {
                              amount_cents: isNaN(val) ? 0 : Math.round(val * 100),
                            });
                          }}
                          className="w-full bg-[#14141A] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                        />
                      </div>

                      {/* Date */}
                      <div>
                        <label className="block text-[10px] font-sans font-bold text-neutral-400 uppercase mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={item.txn_date}
                          onChange={(e) => updateStagedTransaction(item.id, { txn_date: e.target.value })}
                          className="w-full bg-[#14141A] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                        />
                      </div>
                    </div>

                    {/* Payee / Description & Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/[0.08]">
                      <div className="w-full sm:w-2/3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateStagedTransaction(item.id, { description: e.target.value })}
                          placeholder="Description / Payee Name..."
                          className="w-full bg-transparent border-b border-white/15 py-1 text-xs text-white placeholder-neutral-500 focus:border-white focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => removeStagedTransaction(item.id)}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-rose-500/10 text-neutral-400 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                          title="Discard transaction"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          disabled={loadingIds[item.id] || !item.account_id}
                          onClick={() => handleApprove(item)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-100 disabled:opacity-40 text-black rounded-full text-xs font-bold shadow-lg transition-all active:scale-95 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                          <span>Approve & Log</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalUI, document.body);
}
