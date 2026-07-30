"use client";

import React, { useState } from "react";
import { X, Check, Trash2, Mail, MessageSquare, AlertCircle, Sparkles, CheckCheck, Inbox, ShieldCheck } from "lucide-react";
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
  const { stagedTransactions, updateStagedTransaction, removeStagedTransaction, clearAllStaged } =
    useStagedTransactions();
  const { data: accounts = [] } = useAccounts();
  const { categories } = useCategories();

  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Glassmorphic Modal Box Container */}
      <div className="bg-slate-900/90 border border-slate-800/90 shadow-2xl rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] backdrop-blur-xl ring-1 ring-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-100 text-lg tracking-tight">Staged Inbox</h2>
                {stagedTransactions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {stagedTransactions.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Review and approve auto-parsed SMS & Email transactions before they enter your ledger.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-lg transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 font-sans custom-scrollbar">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm animate-in slide-in-from-top-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {stagedTransactions.length === 0 ? (
            /* Glassmorphic Empty State */
            <div className="py-14 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 shadow-inner">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-slate-100">Inbox Clean & Clear!</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No unreviewed transactions pending. Forwarded bank emails and parsed SMS will land here for instant 1-click review.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Batch Action Toolbar */}
              <div className="flex items-center justify-between text-xs font-mono bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                <span className="text-slate-300">
                  <strong>{stagedTransactions.length}</strong> pending transaction(s)
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleApproveAll}
                    className="flex items-center gap-1.5 text-emerald-400 font-semibold hover:text-emerald-300 transition-colors"
                  >
                    <CheckCheck className="h-4 w-4" /> Approve All
                  </button>
                  <span className="text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={clearAllStaged}
                    className="text-slate-400 hover:text-rose-400 transition-colors"
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
                    className="p-4 bg-slate-800/40 border border-slate-700/60 hover:border-emerald-500/40 rounded-xl space-y-3.5 transition-all shadow-md backdrop-blur-md group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {item.source === "email" ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-md border border-sky-500/20 uppercase font-mono tracking-wider">
                            <Mail className="h-3 w-3" /> Gmail
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 uppercase font-mono tracking-wider">
                            <MessageSquare className="h-3 w-3" /> SMS
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-mono">{item.created_at.split("T")[0]}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateStagedTransaction(item.id, {
                            type: item.type === "expense" ? "income" : "expense",
                          })
                        }
                        className={`px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase cursor-pointer transition-all font-mono tracking-wider ${
                          item.type === "expense"
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                        }`}
                      >
                        {item.type}
                      </button>
                    </div>

                    {/* Inputs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
                      {/* Account */}
                      <div>
                        <label className="block text-[10px] font-sans font-semibold text-slate-400 uppercase mb-1">
                          Account *
                        </label>
                        <select
                          value={item.account_id}
                          onChange={(e) => updateStagedTransaction(item.id, { account_id: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">-- Select Account --</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({acc.type})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-[10px] font-sans font-semibold text-slate-400 uppercase mb-1">
                          Category
                        </label>
                        <select
                          value={item.category}
                          onChange={(e) => updateStagedTransaction(item.id, { category: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-[10px] font-sans font-semibold text-slate-400 uppercase mb-1">
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
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Date */}
                      <div>
                        <label className="block text-[10px] font-sans font-semibold text-slate-400 uppercase mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={item.txn_date}
                          onChange={(e) => updateStagedTransaction(item.id, { txn_date: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Payee / Description & Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-700/40">
                      <div className="w-full sm:w-2/3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateStagedTransaction(item.id, { description: e.target.value })}
                          placeholder="Description / Payee Name..."
                          className="w-full bg-transparent border-b border-slate-700 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => removeStagedTransaction(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Discard transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          disabled={loadingIds[item.id] || !item.account_id}
                          onClick={() => handleApprove(item)}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-lg text-xs font-bold shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Check className="h-4 w-4 stroke-[3]" />
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
}
