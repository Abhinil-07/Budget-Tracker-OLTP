"use client";

import React, { useState } from "react";
import { X, Check, Trash2, Mail, MessageSquare, AlertCircle, Sparkles, CheckCheck } from "lucide-react";
import { useStagedTransactions, StagedTransactionItem } from "../../hooks/useStagedTransactions";
import { useAccounts } from "../../hooks/useAccounts";
import { useCategories } from "../../hooks/useCategories";
import { api, ApiError } from "../../lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "../../lib/formatCurrency";

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

    try {
      await api.transactions.create({
        account_id: item.account_id,
        type: item.type,
        amount_cents: item.amount_cents,
        category: item.category,
        description: item.description,
        txn_date: item.txn_date,
      });

      // Refetch accounts & transactions
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["budget"] });

      // Remove from staged queue
      removeStagedTransaction(item.id);
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
      setError("Please assign accounts to your staged transactions first.");
      return;
    }

    setError(null);
    for (const item of validItems) {
      await handleApprove(item);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-surface-raised/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-accent/15 rounded-lg">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary text-lg">Staged Inbox</h2>
              <p className="text-xs text-text-muted">
                Review and approve auto-parsed SMS & Email transactions before they enter your ledger.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary hover:bg-surface-raised rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 font-sans">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 text-danger rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {stagedTransactions.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-surface-raised rounded-full text-text-muted border border-border">
                <Check className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-base font-semibold text-text-primary">Inbox Clean & Clear!</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                No unreviewed transactions pending. Forwarded bank emails and parsed SMS will land here for your review.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono bg-surface-raised/60 p-3 rounded-lg border border-border/50">
                <span className="text-text-secondary">
                  <strong>{stagedTransactions.length}</strong> transaction(s) pending review.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleApproveAll}
                    className="flex items-center gap-1 text-accent font-semibold hover:underline"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Approve All Ready
                  </button>
                  <span className="text-border">|</span>
                  <button
                    type="button"
                    onClick={clearAllStaged}
                    className="text-text-muted hover:text-danger hover:underline"
                  >
                    Discard All
                  </button>
                </div>
              </div>

              {/* Transaction Cards List */}
              <div className="space-y-3">
                {stagedTransactions.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-surface-raised/30 border border-border rounded-xl space-y-3 hover:border-border/90 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {item.source === "email" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent bg-accent/15 px-2 py-0.5 rounded border border-accent/30 uppercase font-mono">
                            <Mail className="h-3 w-3" /> Gmail
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success bg-success/15 px-2 py-0.5 rounded border border-success/30 uppercase font-mono">
                            <MessageSquare className="h-3 w-3" /> SMS
                          </span>
                        )}
                        <span className="text-xs text-text-muted font-mono">{item.created_at.split("T")[0]}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateStagedTransaction(item.id, {
                              type: item.type === "expense" ? "income" : "expense",
                            })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase cursor-pointer transition-all ${
                            item.type === "expense"
                              ? "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25"
                              : "bg-success/15 text-success border border-success/30 hover:bg-success/25"
                          }`}
                        >
                          {item.type}
                        </button>
                      </div>
                    </div>

                    {/* Form Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
                      {/* Account Picker */}
                      <div>
                        <label className="block text-[10px] font-sans font-semibold text-text-muted uppercase mb-1">
                          Account *
                        </label>
                        <select
                          value={item.account_id}
                          onChange={(e) => updateStagedTransaction(item.id, { account_id: e.target.value })}
                          className="w-full bg-surface border border-border/80 rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
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
                        <label className="block text-[10px] font-sans font-semibold text-text-muted uppercase mb-1">
                          Category
                        </label>
                        <select
                          value={item.category}
                          onChange={(e) => updateStagedTransaction(item.id, { category: e.target.value })}
                          className="w-full bg-surface border border-border/80 rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Amount (₹) */}
                      <div>
                        <label className="block text-[10px] font-sans font-semibold text-text-muted uppercase mb-1">
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
                          className="w-full bg-surface border border-border/80 rounded px-2.5 py-1.5 text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>

                      {/* Date */}
                      <div>
                        <label className="block text-[10px] font-sans font-semibold text-text-muted uppercase mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={item.txn_date}
                          onChange={(e) => updateStagedTransaction(item.id, { txn_date: e.target.value })}
                          className="w-full bg-surface border border-border/80 rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>
                    </div>

                    {/* Description & Action buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/40">
                      <div className="w-full sm:w-2/3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateStagedTransaction(item.id, { description: e.target.value })}
                          placeholder="Description / Payee..."
                          className="w-full bg-transparent border-b border-border/50 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => removeStagedTransaction(item.id)}
                          className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          title="Discard transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          disabled={loadingIds[item.id] || !item.account_id}
                          onClick={() => handleApprove(item)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-text-primary rounded-lg text-xs font-semibold shadow-sm transition-all"
                        >
                          <Check className="h-4 w-4" />
                          <span>{loadingIds[item.id] ? "Saving..." : "Approve & Log"}</span>
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
