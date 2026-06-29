"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "../stores/useAuthStore";
import { useFinanceStore } from "../stores/useFinanceStore";
import { useAccounts } from "../hooks/useAccounts";
import { useTransactions } from "../hooks/useTransactions";
import { useBudget } from "../hooks/useBudget";
import PageWrapper from "../components/layout/PageWrapper";
import AccountCard from "../components/accounts/AccountCard";
import AddTransactionModal from "../components/transactions/AddTransactionModal";
import { formatCurrency } from "../lib/formatCurrency";
import { formatDate } from "../lib/formatDate";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const { token, user, hydrated, hydrate } = useAuthStore();
  const { selectedAccountId, setSelectedAccountId } = useFinanceStore();
  const [showAddModal, setShowAddModal] = useState(false);

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Redirect to login if hydrated and no token
  useEffect(() => {
    if (hydrated && !token) {
      window.location.href = "/login";
    }
  }, [hydrated, token]);

  // Generate list of the last 6 months for the timeframe selector
  const timeframes = useMemo(() => {
    const list = [];
    const dateObj = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(dateObj.getFullYear(), dateObj.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "long", year: "numeric" });
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      list.push({ label, value });
    }
    return list;
  }, []);

  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("");

  useEffect(() => {
    if (timeframes.length > 0 && !selectedTimeframe) {
      setSelectedTimeframe(timeframes[0].value);
    }
  }, [timeframes, selectedTimeframe]);

  // Determine selected month range for calculations (using local timezone formatting)
  const dateRange = useMemo(() => {
    if (!selectedTimeframe) {
      const today = new Date();
      const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
      return { start, end: undefined };
    }
    const start = selectedTimeframe;
    const parts = start.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${parts[0]}-${parts[1].padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { start, end };
  }, [selectedTimeframe]);

  // Fetch Accounts
  const {
    data: accounts = [],
    isLoading: accountsLoading,
    error: accountsError,
  } = useAccounts();

  // Fetch Transactions (filtered by selected account and date range if set)
  const transactionParams = useMemo(() => {
    return {
      page: 1,
      page_size: 10,
      ...(selectedAccountId ? { account_id: selectedAccountId } : {}),
      date_from: dateRange.start,
      date_to: dateRange.end,
    };
  }, [selectedAccountId, dateRange]);

  const {
    data: txnData,
    isLoading: txnsLoading,
    error: txnsError,
  } = useTransactions(transactionParams);

  // Fetch all selected month's income transactions to sum MTD income
  const incomeParams = useMemo(() => {
    return {
      type: "income" as const,
      date_from: dateRange.start,
      date_to: dateRange.end,
      page_size: 1000,
    };
  }, [dateRange]);

  const { data: incomeData } = useTransactions(incomeParams);

  // Fetch Budget for the selected month
  const {
    data: budget,
    isLoading: budgetLoading,
    error: budgetError,
  } = useBudget(selectedTimeframe || undefined);

  const handleAccountClick = (accountId: string) => {
    if (selectedAccountId === accountId) {
      setSelectedAccountId(null);
    } else {
      setSelectedAccountId(accountId);
    }
  };

  // Show loading state until auth is resolved
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

  const isLoading = accountsLoading || txnsLoading || budgetLoading;
  const isError = accountsError || txnsError || budgetError;

  // Calculate MTD Income
  const mtdIncomeCents =
    incomeData?.items.reduce((sum, item) => sum + item.amount_cents, 0) || 0;

  // Budget details
  const totalBudgetCents = budget?.total_cents || 0;
  const mtdSpentCents = budget?.mtd_spent_cents || 0;
  const remainingCents = budget?.remaining_cents || 0;
  const percentageUsed = budget?.percentage_used || 0;

  return (
    <PageWrapper title="Dashboard" onAddTransactionClick={() => setShowAddModal(true)}>
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
      {isError && (
        <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>Error loading dashboard metrics. Please refresh.</span>
        </div>
      )}

      {/* Welcome Banner */}
      {user && (
        <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-surface-raised via-surface to-surface-raised border border-border/80 relative overflow-hidden select-none">
          <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Hi, <span className="text-accent">{user.email?.split("@")[0] || "Command User"}</span> 👋
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1.5 leading-relaxed max-w-xl">
            Welcome to <span className="text-white font-semibold">Finance Command</span>. Take control of your money, analyze budget thresholds, and build your net worth dynamically.
          </p>
        </div>
      )}

      {/* Timeframe Selector Panel */}
      <div className="mb-6 p-4 rounded-xl bg-surface border border-border/60 flex items-center justify-between flex-wrap gap-3 select-none">
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-text-secondary uppercase font-mono tracking-wider font-semibold">Active Period:</span>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="bg-surface-raised border border-border rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer min-w-[150px]"
          >
            {timeframes.map((tf: { label: string; value: string }) => (
              <option key={tf.value} value={tf.value}>
                {tf.label}
              </option>
            ))}
          </select>
        </div>
        {selectedTimeframe && timeframes.length > 0 && selectedTimeframe !== timeframes[0].value && (
          <button
            onClick={() => setSelectedTimeframe(timeframes[0].value)}
            className="text-xs text-accent hover:underline font-mono"
          >
            Back to Current Month
          </button>
        )}
      </div>

      {/* Account Cards Area */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Your Accounts
          </h3>
          {selectedAccountId && (
            <button
              onClick={() => setSelectedAccountId(null)}
              className="text-xs text-accent hover:underline font-mono"
            >
              Clear Filter
            </button>
          )}
        </div>

        {accountsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-surface border border-border p-6 rounded-xl h-40 animate-pulse flex flex-col justify-between">
                <div className="h-4 bg-surface-raised w-1/3 rounded" />
                <div className="h-8 bg-surface-raised w-1/2 rounded" />
                <div className="h-3 bg-surface-raised w-1/4 rounded" />
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-surface p-12 rounded-xl border border-border text-center flex flex-col items-center justify-center gap-3">
            <p className="text-text-secondary text-sm font-medium">Add your first account to get started</p>
            <Link
              href="/accounts"
              className="px-4 py-2 bg-accent hover:bg-accent/90 text-text-primary rounded-lg text-xs font-semibold transition-all shadow-md shadow-accent/10"
            >
              Go to Accounts
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {accounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                isSelected={selectedAccountId === acc.id}
                onClick={() => handleAccountClick(acc.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Budget Progress Area */}
      <div className="bg-surface p-6 rounded-xl border border-border">
        {budgetLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="flex justify-between items-center text-sm">
              <div className="h-4 bg-surface-raised w-1/4 rounded" />
              <div className="h-4 bg-surface-raised w-1/3 rounded" />
            </div>
            <div className="w-full bg-border rounded-full h-3 overflow-hidden">
              <div className="h-full bg-surface-raised rounded w-full" />
            </div>
            <div className="h-3 bg-surface-raised w-1/6 rounded" />
          </div>
        ) : totalBudgetCents === 0 ? (
          <div className="text-center py-4 flex flex-col items-center gap-3">
            <p className="text-sm text-text-secondary">Set a monthly budget to track spending</p>
            <Link
              href="/budget"
              className="px-4 py-2 bg-accent hover:bg-accent/90 text-text-primary rounded-lg text-xs font-semibold transition-all shadow-md shadow-accent/10"
            >
              Set Budget
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-text-primary">Monthly Budget Progress</span>
              <span className="text-text-secondary font-mono">
                {formatCurrency(mtdSpentCents, "INR")} / {formatCurrency(totalBudgetCents, "INR")} ({Math.round(percentageUsed)}%)
              </span>
            </div>
            <div className="w-full bg-border rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentageUsed >= 90
                    ? "bg-danger"
                    : percentageUsed >= 75
                    ? "bg-warning"
                    : "bg-success"
                }`}
                style={{ width: `${percentageUsed}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-text-secondary font-mono">
              <span>{formatCurrency(remainingCents, "INR")} remaining</span>
              {percentageUsed >= 80 && (
                <span className="text-warning font-semibold">
                  Warning: Budget threshold crossed (80%+)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {budgetLoading ? (
          [1, 2, 3].map((n) => (
            <div key={n} className="bg-surface p-6 rounded-xl border border-border animate-pulse space-y-3">
              <div className="h-3 bg-surface-raised w-1/3 rounded" />
              <div className="h-6 bg-surface-raised w-1/2 rounded" />
            </div>
          ))
        ) : (
          <>
            <div className="bg-surface p-6 rounded-xl border border-border">
              <div className="text-xs text-text-muted uppercase tracking-wider mb-2">
                Spent MTD
              </div>
              <div className="font-mono text-xl font-bold text-danger">
                {formatCurrency(mtdSpentCents, "INR")}
              </div>
            </div>
            <div className="bg-surface p-6 rounded-xl border border-border">
              <div className="text-xs text-text-muted uppercase tracking-wider mb-2">
                Remaining Budget
              </div>
              <div className="font-mono text-xl font-bold text-text-primary">
                {formatCurrency(remainingCents, "INR")}
              </div>
            </div>
            <div className="bg-surface p-6 rounded-xl border border-border">
              <div className="text-xs text-text-muted uppercase tracking-wider mb-2">
                Income MTD
              </div>
              <div className="font-mono text-xl font-bold text-success">
                {formatCurrency(mtdIncomeCents, "INR")}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent Transactions List */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-text-primary">Recent Transactions</h3>
            {selectedAccountId && (
              <p className="text-xs text-accent mt-0.5 font-mono">
                Filtered by selected account
              </p>
            )}
          </div>
          <span className="text-xs text-text-secondary font-mono">Showing last 10</span>
        </div>

        {txnsLoading ? (
          <div className="divide-y divide-border p-6 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex justify-between items-center animate-pulse py-2">
                <div className="flex flex-col gap-2 w-1/3">
                  <div className="h-4 bg-surface-raised rounded w-3/4" />
                  <div className="h-3 bg-surface-raised rounded w-1/2" />
                </div>
                <div className="h-6 bg-surface-raised rounded w-20" />
              </div>
            ))}
          </div>
        ) : !txnData || txnData.items.length === 0 ? (
          <div className="p-12 text-center text-text-secondary text-sm flex flex-col items-center justify-center gap-3">
            <span>No transactions yet</span>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-accent hover:bg-accent/90 text-text-primary rounded-lg text-xs font-semibold transition-all shadow-md shadow-accent/10"
            >
              Add Transaction
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {txnData.items.map((txn) => (
              <div
                key={txn.id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-surface-raised transition-colors duration-150 gap-2 sm:gap-6"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-text-primary block break-words">
                    {txn.description || "Unlabeled Transaction"}
                  </span>
                  <span className="text-xs text-text-secondary">{txn.category}</span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 mt-1 sm:mt-0 shrink-0">
                  <span className="text-xs text-text-muted">{formatDate(txn.txn_date)}</span>
                  <span
                    className={`text-sm font-semibold font-mono ${
                      txn.type === "income" ? "text-success" : "text-danger"
                    }`}
                  >
                    {txn.type === "income" ? "+ " : "- "}
                    {formatCurrency(txn.amount_cents, "INR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
