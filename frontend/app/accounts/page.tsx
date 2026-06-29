"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { useAccounts } from "../../hooks/useAccounts";
import { useTransactions } from "../../hooks/useTransactions";
import PageWrapper from "../../components/layout/PageWrapper";
import AddAccountModal from "../../components/accounts/AddAccountModal";
import { formatCurrency } from "../../lib/formatCurrency";
import { ACCOUNT_TYPES } from "../../lib/constants";
import type { AccountType } from "../../lib/constants";
import { api, ApiError } from "../../lib/api";
import { useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const { token, hydrated, hydrate } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);

  // Inline editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // Deletion states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Hydrate auth
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Redirect if not logged in
  useEffect(() => {
    if (hydrated && !token) {
      window.location.href = "/login";
    }
  }, [hydrated, token]);

  // Fetch accounts
  const { data: accounts = [], isLoading: accountsLoading, error: accountsError } = useAccounts();

  // Fetch transactions to find which accounts have transactions
  const { data: txnData } = useTransactions({ page_size: 1000 });

  // Compute a set of account IDs that have transactions
  const accountsWithTxns = useMemo(() => {
    const ids = new Set<string>();
    if (txnData?.items) {
      txnData.items.forEach((txn) => ids.add(txn.account_id));
    }
    return ids;
  }, [txnData]);

  // Inline edit handlers
  const startEdit = (id: string, currentName: string, currentBalanceCents: number) => {
    setEditingId(id);
    setEditName(currentName);
    setEditBalance((currentBalanceCents / 100).toFixed(2));
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditBalance("");
    setEditError(null);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) {
      setEditError("Name cannot be empty.");
      return;
    }
    const balanceNum = parseFloat(editBalance);
    if (isNaN(balanceNum)) {
      setEditError("Please enter a valid numeric balance.");
      return;
    }
    const balanceCents = Math.round(balanceNum * 100);
    try {
      const res = await api.accounts.update(id, {
        name: editName.trim(),
        balance_cents: balanceCents,
      });
      if (res.error) throw new Error(res.error.message);

      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] }); // invalidate transactions to update running balance checks if any
      setEditingId(null);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Failed to update account details.";
      setEditError(message);
    }
  };

  // Delete handlers
  const confirmDelete = async (id: string) => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await api.accounts.delete(id);
      if (res.error) throw new Error(res.error.message);

      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setDeletingId(null);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Cannot delete account. Ensure it has no remaining transactions.";
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!hydrated || !token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent border-r-2" />
          <span className="text-sm text-text-secondary font-mono">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper title="Accounts">
      {/* Add Account Modal */}
      <AddAccountModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

      {/* Main Container */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Accounts Management</h2>
            <p className="text-sm text-text-secondary mt-1">
              Add new banking profiles or update credentials.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-text-primary rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Add Account</span>
          </button>
        </div>

        {accountsError && (
          <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>Error loading accounts. Please refresh.</span>
          </div>
        )}

        {accountsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-surface border border-border p-6 rounded-xl h-44 animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-surface p-12 rounded-xl border border-border text-center">
            <Wallet className="h-10 w-10 text-text-muted mx-auto mb-4" />
            <h3 className="font-semibold text-text-primary">No Accounts Configured</h3>
            <p className="text-text-secondary text-sm mt-1 max-w-sm mx-auto">
              Configure your savings, current, or credit card accounts to get started tracking transactions.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-accent hover:bg-accent/90 text-text-primary rounded-lg text-sm font-semibold transition-all"
            >
              Add Your First Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {accounts.map((acc) => {
              const isEditing = editingId === acc.id;
              const hasTransactions = accountsWithTxns.has(acc.id);

              return (
                <div
                  key={acc.id}
                  className="bg-surface border border-border hover:border-text-muted rounded-xl p-6 flex flex-col justify-between shadow-lg transition-all group"
                >
                  {/* Card Content (Header & Body) */}
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-3 bg-surface-raised/40 p-3 rounded-lg border border-border/50">
                        <div>
                          <label className="text-[10px] text-text-muted uppercase font-mono block mb-1">Account Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-surface-raised border border-border rounded px-2.5 py-1 text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                            placeholder="Account Name"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(acc.id);
                              if (e.key === "Escape") cancelEdit();
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-text-muted uppercase font-mono block mb-1">
                            {acc.type === "credit_card" ? "Owed Balance (₹)" : "Current Balance (₹)"}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editBalance}
                            onChange={(e) => setEditBalance(e.target.value)}
                            className="w-full bg-surface-raised border border-border rounded px-2.5 py-1 text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                            placeholder="0.00"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(acc.id);
                              if (e.key === "Escape") cancelEdit();
                            }}
                          />
                        </div>
                        {editError && <p className="text-[10px] text-danger font-mono">{editError}</p>}
                        <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                          <button
                            onClick={cancelEdit}
                            className="p-1 rounded bg-surface-raised border border-border hover:bg-border text-text-muted hover:text-text-primary transition-all"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => saveEdit(acc.id)}
                            className="p-1 rounded bg-success/15 border border-success/20 hover:bg-success/25 text-success transition-all"
                            title="Save changes"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Title and Type */}
                        <div className="flex justify-between items-start gap-2 mb-4">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-text-primary truncate text-base">
                              {acc.name}
                            </h3>
                            <span className="text-xs text-text-muted uppercase font-mono tracking-wider">
                              {ACCOUNT_TYPES[acc.type as AccountType] || acc.type}
                            </span>
                          </div>
                          <button
                            onClick={() => startEdit(acc.id, acc.name, acc.balance_cents)}
                            className="p-1.5 rounded bg-surface-raised text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Edit account details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Balance */}
                        <div className="my-5">
                          <div className="text-xs text-text-muted uppercase tracking-wider mb-1 font-mono">
                            {acc.type === "credit_card" ? "Owed Amount" : "Current Balance"}
                          </div>
                          <div
                            className={`font-mono text-2xl font-bold tracking-tight ${
                              acc.type === "credit_card"
                                ? "text-danger"
                                : acc.balance_cents >= 0
                                ? "text-success"
                                : "text-danger"
                            }`}
                          >
                            {acc.type === "credit_card" && "₹ "}
                            {formatCurrency(acc.balance_cents, acc.currency)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Card Footer: Info & Delete Actions */}
                  <div className="flex justify-between items-center border-t border-border/50 pt-4">
                    <span className="text-[10px] text-text-muted font-mono uppercase tracking-widest truncate max-w-[150px]">
                      {acc.account_number ? `#...${acc.account_number.slice(-4)}` : "No Acc Number"}
                    </span>

                    {/* Delete Action */}
                    <div className="flex items-center gap-1.5">
                      {hasTransactions ? (
                        <div className="relative group/tooltip">
                          <button
                            disabled
                            className="p-1.5 rounded text-text-muted/30 cursor-not-allowed"
                            title="Cannot delete accounts with existing transactions"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                          <span className="absolute bottom-full right-0 mb-2 w-48 scale-0 group-hover/tooltip:scale-100 transition-all origin-bottom-right duration-100 bg-surface-raised border border-border text-[10px] text-text-secondary font-mono p-2 rounded shadow-xl pointer-events-none">
                            Locked: account contains transactions. Delete transactions first.
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(acc.id)}
                          className="p-1.5 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                          title="Delete account"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeletingId(null)} />
          <div className="relative bg-surface border border-border rounded-xl p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <h4 className="text-base font-semibold text-text-primary">Delete Account</h4>
            <p className="text-sm text-text-secondary">
              Are you sure you want to delete this account? This action is permanent and cannot be undone.
            </p>
            {deleteError && (
              <div className="bg-danger/10 border border-danger/25 text-danger px-3 py-2 rounded text-xs">
                {deleteError}
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeletingId(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 border border-border hover:bg-surface-raised rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDelete(deletingId)}
                disabled={isDeleting}
                className="px-4 py-2 bg-danger hover:bg-danger/90 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-danger/25"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
