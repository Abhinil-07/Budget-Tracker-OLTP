"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import PageWrapper from "@/components/layout/PageWrapper";
import AccountCard from "@/components/accounts/AccountCard";
import AddAccountModal from "@/components/accounts/AddAccountModal";
import EditAccountModal from "@/components/accounts/EditAccountModal";
import AuthLoadingScreen from "@/components/auth/AuthLoadingScreen";
import { Account } from "@/types/account";
import {
  CreditCard,
  Plus,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function AccountsPage() {
  const { token, hydrated, hydrate } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

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

  // Fetch transactions to find accounts with transactions and calculate MTD spend
  const { data: txnData } = useTransactions({ page_size: 1000 });

  // Compute a set of account IDs that have transactions
  const accountsWithTxns = useMemo(() => {
    const ids = new Set<string>();
    if (txnData?.items) {
      txnData.items.forEach((txn) => ids.add(txn.account_id));
    }
    return ids;
  }, [txnData]);

  // Calculate current month's spend for each account
  const spentByAccount = useMemo(() => {
    const map = new Map<string, number>();
    if (!txnData?.items) return map;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    txnData.items.forEach((t) => {
      if (t.type === "expense") {
        const d = new Date(t.txn_date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          map.set(t.account_id, (map.get(t.account_id) || 0) + t.amount_cents);
        }
      }
    });
    return map;
  }, [txnData]);

  if (!hydrated || !token) {
    return <AuthLoadingScreen statusMessage="Synchronizing digital cards..." />;
  }

  return (
    <PageWrapper title="Cards">
      {/* Add Account Modal */}
      <AddAccountModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

      {/* Edit Account Modal */}
      <EditAccountModal
        isOpen={!!editingAccount}
        onClose={() => setEditingAccount(null)}
        account={editingAccount}
        hasTransactions={editingAccount ? accountsWithTxns.has(editingAccount.id) : false}
      />

      {/* Main Container */}
      <div className="space-y-7">
        {/* Top Header Row (Matching Reference Video Frame 2 "Cards" header) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Cards</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-white/80">
                {accounts.length} Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400">
              Your digital cards and banking liabilities. Tap any card for settings and details.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white hover:bg-neutral-100 text-black rounded-full text-xs font-bold transition-all duration-200 shadow-xl hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add Card</span>
          </button>
        </div>

        {accountsError && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 px-4 py-3 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Error loading cards. Please refresh.</span>
          </div>
        )}

        {accountsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-[#121216] border border-white/[0.08] p-7 rounded-[32px] h-[220px] animate-pulse flex flex-col justify-between"
              >
                <div className="h-4 bg-white/10 w-1/3 rounded-full" />
                <div className="h-8 bg-white/10 w-2/3 rounded-full" />
                <div className="flex gap-2">
                  <div className="w-9 h-9 rounded-full bg-white/10" />
                  <div className="w-9 h-9 rounded-full bg-white/10" />
                  <div className="w-9 h-9 rounded-full bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-[#121216] p-12 rounded-[32px] border border-white/[0.08] text-center max-w-lg mx-auto my-8">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-white/70">
              <CreditCard className="h-7 w-7" />
            </div>
            <h3 className="font-bold text-white text-base">No Cards Added Yet</h3>
            <p className="text-neutral-400 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
              Connect your savings, checking, or credit card accounts to visualize your digital wallet.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-5 px-6 py-2.5 bg-white hover:bg-neutral-100 text-black rounded-full text-xs font-bold transition-all cursor-pointer shadow-lg active:scale-95"
            >
              Add Your First Card
            </button>
          </div>
        ) : (
          /* Cards Grid / Stack */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {accounts.map((acc, index) => (
              <AccountCard
                key={acc.id}
                account={acc}
                colorIndex={index}
                spentThisMonthCents={spentByAccount.get(acc.id) || 0}
                onClick={() => setEditingAccount(acc)}
                onEdit={() => setEditingAccount(acc)}
              />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
