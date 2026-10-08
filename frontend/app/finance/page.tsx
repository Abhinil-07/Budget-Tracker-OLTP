"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useFinanceStore } from "@/stores/useFinanceStore";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useBudget } from "@/hooks/useBudget";
import { useInvestments } from "@/hooks/useInvestments";
import PageWrapper from "@/components/layout/PageWrapper";
import AccountCard from "@/components/accounts/AccountCard";
import BalancesCard from "@/components/splits/BalancesCard";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import BudgetAlertBanners from "@/components/budget/BudgetAlertBanners";
import { formatCurrency } from "@/lib/formatCurrency";
import { formatDate } from "@/lib/formatDate";
import { 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  ArrowUp, 
  Wallet, 
  Users, 
  ShoppingBag, 
  Calendar,
  Sparkles,
  Plus,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard
} from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const { token, user, hydrated, hydrate } = useAuthStore();
  const { selectedAccountId, setSelectedAccountId } = useFinanceStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<"expense" | "income">("expense");
  const [isNetWorthMasked, setIsNetWorthMasked] = useState(false);

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

  // Initialize selectedTimeframe to the current month (YYYY-MM-01)
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  });

  // Determine selected month range for calculations (using local timezone formatting)
  const dateRange = useMemo(() => {
    const start = selectedTimeframe || (() => {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    })();
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

  // Fetch all selected month's expense transactions to calculate per-account spend (only included expenses)
  const expenseParams = useMemo(() => {
    return {
      type: "expense" as const,
      is_included: true,
      date_from: dateRange.start,
      date_to: dateRange.end,
      page_size: 1000,
    };
  }, [dateRange]);

  const { data: expenseData } = useTransactions(expenseParams);

  // Map of account_id -> total spent cents in the selected timeframe (only included transactions)
  const spentByAccount = useMemo(() => {
    const map: Record<string, number> = {};
    if (expenseData?.items) {
      expenseData.items.forEach((item) => {
        if (item.is_included !== false) {
          map[item.account_id] = (map[item.account_id] || 0) + item.amount_cents;
        }
      });
    }
    return map;
  }, [expenseData]);

  // Map of account_id -> total income cents in the selected timeframe
  const incomeByAccount = useMemo(() => {
    const map: Record<string, number> = {};
    if (incomeData?.items) {
      incomeData.items.forEach((item) => {
        map[item.account_id] = (map[item.account_id] || 0) + item.amount_cents;
      });
    }
    return map;
  }, [incomeData]);

  // Fetch all-time transactions for the "Owed to Me" category
  const owedParams = useMemo(() => {
    return {
      category: "Owed to Me",
      page_size: 1000,
    };
  }, []);

  const { data: owedData } = useTransactions(owedParams);

  const {
    data: budget,
    isLoading: budgetLoading,
    error: budgetError,
  } = useBudget(selectedTimeframe || undefined);

  // Fetch Investments for Net Worth calculation
  const { data: investments = [] } = useInvestments();

  // Calculate roommate outstanding balance
  const totalOwedCents = useMemo(() => {
    if (!owedData?.items) return 0;
    return owedData.items.reduce((sum, item) => {
      if (item.type === "expense") {
        return sum + item.amount_cents; // We lended (roommate owes us)
      } else {
        return sum - item.amount_cents; // Roommate repaid us (reduces what they owe)
      }
    }, 0);
  }, [owedData]);

  // Calculate Net Worth dynamically
  const netWorthCents = useMemo(() => {
    let liquidCents = 0;
    let debtCents = 0;
    
    accounts.forEach((acc) => {
      if (acc.type === "credit_card") {
        debtCents += acc.balance_cents;
      } else {
        liquidCents += acc.balance_cents;
      }
    });

    const investmentCents = investments.reduce((sum, inv) => sum + inv.current_value_cents, 0);
    return (liquidCents + investmentCents + totalOwedCents) - debtCents;
  }, [accounts, investments, totalOwedCents]);

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
    <PageWrapper
      title="Dashboard"
      onAddTransactionClick={() => {
        setAddModalType("expense");
        setShowAddModal(true);
      }}
      actionLabel="Log Entry"
    >
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        defaultType={addModalType}
      />
      {isError && (
        <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>Error loading dashboard metrics. Please refresh.</span>
        </div>
      )}

      {/* Aurora Hero Card (Matching Reference Video Frame 0) */}
      {user && (
        <div className="mb-8 select-none">
          <div className="bg-aurora text-white p-7 sm:p-8 rounded-[32px] shadow-2xl relative overflow-hidden border border-white/10">
            {/* Top row */}
            <div className="flex items-center justify-between gap-4 mb-6 relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold text-white border border-white/15 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Total Net Worth</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNetWorthMasked(!isNetWorthMasked)}
                  title={isNetWorthMasked ? "Reveal balance" : "Hide balance"}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 transition-all cursor-pointer active:scale-90"
                >
                  {isNetWorthMasked ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Middle: Amount & Greeting */}
            <div className="my-2 relative z-10">
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider block mb-1">
                Total Balance
              </span>
              <div className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white drop-shadow-sm font-sans">
                {isNetWorthMasked ? "••••••••" : formatCurrency(netWorthCents, "INR")}
              </div>
              <p className="text-xs sm:text-sm text-white/80 mt-2 font-medium">
                Welcome back, <span className="text-white font-bold">{user.email?.split("@")[0] || "User"}</span> 👋
              </p>
            </div>

            {/* Bottom Quick Actions Row (Expense / Income / Accounts) */}
            <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 pt-5 mt-4 border-t border-white/10 relative z-10">
              {/* Log Expense */}
              <button
                onClick={() => {
                  setAddModalType("expense");
                  setShowAddModal(true);
                }}
                className="bg-white hover:bg-neutral-100 text-black font-extrabold px-4 py-2.5 rounded-2xl transition-all shadow-lg flex items-center gap-1.5 text-xs active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Expense</span>
              </button>

              {/* Log Income */}
              <button
                onClick={() => {
                  setAddModalType("income");
                  setShowAddModal(true);
                }}
                className="bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-bold px-4 py-2.5 rounded-2xl border border-white/15 transition-all shadow-lg flex items-center gap-1.5 text-xs active:scale-95 cursor-pointer"
              >
                <TrendingUp className="h-4 w-4 stroke-[2.5] text-emerald-300" />
                <span>Income</span>
              </button>

              <Link
                href="/finance/accounts"
                className="bg-white/15 hover:bg-white/20 backdrop-blur-md text-white font-medium px-4 py-2.5 rounded-2xl border border-white/15 transition-all flex items-center gap-1.5 text-xs"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>{accounts.length} Cards</span>
              </Link>

              <div className="sm:ml-auto inline-flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-3.5 py-2 rounded-2xl text-xs font-medium text-white/90 border border-white/10">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                <span>+{formatCurrency(mtdIncomeCents, "INR")} Inflow MTD</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Threshold Alerts */}
      <div className="mb-6">
        <BudgetAlertBanners
          categoryBreakdown={budget?.category_breakdown}
          totalBudgetCents={totalBudgetCents}
          mtdSpentCents={mtdSpentCents}
          showLinkToBudget
        />
      </div>

      {/* Timeframe Selector Panel */}
      <div className="mb-6 p-4 rounded-2xl bg-[#0B0B0E] border border-white/[0.07] flex items-center justify-between flex-wrap gap-3 select-none">
        <div className="flex items-center gap-2.5">
          <Calendar className="h-4 w-4 text-neutral-400" />
          <span className="text-xs text-neutral-400 uppercase font-mono tracking-wider font-semibold">
            Active Period:
          </span>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="bg-[#141416] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white cursor-pointer min-w-[150px]"
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
            className="text-xs text-white hover:underline font-mono bg-white/10 px-3 py-1.5 rounded-xl"
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
              href="/finance/accounts"
              className="px-4 py-2 bg-accent hover:bg-accent/90 text-black rounded-lg text-xs font-bold transition-all shadow-md shadow-accent/10"
            >
              Go to Accounts
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {accounts.map((acc, index) => (
              <AccountCard
                key={acc.id}
                account={acc}
                colorIndex={index}
                spentThisMonthCents={spentByAccount[acc.id] || 0}
                isSelected={selectedAccountId === acc.id}
                onClick={() => handleAccountClick(acc.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Shared Splits & Balances */}
      <div className="mb-6">
        <BalancesCard />
      </div>

      {/* Primary 4 Metric Cards (Clean Minimal Dark Cards - Matching Reference Analytics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
        {budgetLoading ? (
          [1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-[#0B0B0E] p-5 rounded-2xl border border-white/[0.06] animate-pulse space-y-3 h-[135px] flex flex-col justify-between">
              <div className="h-4 bg-white/10 w-1/3 rounded" />
              <div className="h-7 bg-white/10 w-2/3 rounded" />
            </div>
          ))
        ) : (
          <>
            {/* Card 1: Spent MTD */}
            <div className="bg-[#0B0B0E] border border-white/[0.07] hover:border-white/15 p-5 rounded-2xl shadow-lg flex flex-col justify-between min-h-[135px] transition-all duration-200 select-none">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400">Spent MTD</span>
                <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans text-white">
                  {formatCurrency(mtdSpentCents, "INR")}
                </div>
                <span className="text-[11px] font-medium text-rose-400/80 mt-1 block">
                  Monthly Outflow
                </span>
              </div>
            </div>

            {/* Card 2: Remaining Budget */}
            <div className="bg-[#0B0B0E] border border-white/[0.07] hover:border-white/15 p-5 rounded-2xl shadow-lg flex flex-col justify-between min-h-[135px] transition-all duration-200 select-none">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400">Remaining Budget</span>
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans text-white">
                  {formatCurrency(remainingCents, "INR")}
                </div>
                <span className="text-[11px] font-medium text-emerald-400/80 mt-1 block">
                  Available to Spend
                </span>
              </div>
            </div>

            {/* Card 3: Income MTD */}
            <div className="bg-[#0B0B0E] border border-white/[0.07] hover:border-white/15 p-5 rounded-2xl shadow-lg flex flex-col justify-between min-h-[135px] transition-all duration-200 select-none">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400">Income MTD</span>
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans text-white">
                  {formatCurrency(mtdIncomeCents, "INR")}
                </div>
                <span className="text-[11px] font-medium text-cyan-400/80 mt-1 block">
                  Total Monthly Inflow
                </span>
              </div>
            </div>

            {/* Card 4: Owed to Me */}
            <div className="bg-[#0B0B0E] border border-white/[0.07] hover:border-white/15 p-5 rounded-2xl shadow-lg flex flex-col justify-between min-h-[135px] transition-all duration-200 select-none">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400">Owed to Me</span>
                <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans text-white">
                  {formatCurrency(totalOwedCents, "INR")}
                </div>
                <span className="text-[11px] font-medium text-purple-400/80 mt-1 block">
                  Shared Splits Balance
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Monthly Budget Progress (Clean Dark Card with Aurora Indicator) */}
      <div className="bg-[#121216] p-6 sm:p-7 rounded-3xl border border-white/[0.08] shadow-xl mb-8">
        {budgetLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-5 bg-white/10 w-1/3 rounded" />
            <div className="h-4 bg-white/10 w-full rounded" />
          </div>
        ) : totalBudgetCents === 0 ? (
          <div className="text-center py-6 flex flex-col items-center gap-3">
            <p className="text-sm text-neutral-400">Set a monthly budget to track spending thresholds</p>
            <Link
              href="/finance/budget"
              className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black rounded-full text-xs font-bold transition-all shadow-lg"
            >
              Set Budget
            </Link>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left Circular Gauge */}
            <div className="flex items-center gap-5">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
                <svg className="w-16 h-16 sm:w-20 sm:h-20 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/10"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={
                      percentageUsed >= 90
                        ? "text-rose-500"
                        : percentageUsed >= 75
                        ? "text-amber-500"
                        : "text-cyan-400"
                    }
                    strokeDasharray={`${Math.min(percentageUsed, 100)}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm sm:text-base font-extrabold text-white">
                    {Math.round(percentageUsed)}%
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-neutral-400 block mb-0.5">
                  Monthly Budget Status
                </span>
                <div className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {formatCurrency(mtdSpentCents, "INR")}
                  <span className="text-neutral-500 font-normal text-sm ml-1.5">
                    of {formatCurrency(totalBudgetCents, "INR")}
                  </span>
                </div>
                <div className="text-xs text-neutral-400 mt-1 flex items-center gap-2">
                  <span className="font-semibold text-white">
                    {formatCurrency(remainingCents, "INR")}
                  </span>{" "}
                  available
                  {percentageUsed >= 80 && (
                    <span className="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      Crossed 80%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right progress bar and manage link */}
            <div className="flex-1 max-w-md flex flex-col gap-2">
              <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500">Threshold tracker</span>
                <Link
                  href="/finance/budget"
                  className="text-xs font-semibold text-white/80 hover:text-white hover:underline"
                >
                  Edit Category Budgets &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Transactions List (Matching Device 1 Reference) */}
      <div className="bg-[#121216] rounded-3xl border border-white/[0.08] overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-white/[0.06] flex justify-between items-center">
          <div>
            <h3 className="font-bold text-base text-white">Recent Transactions</h3>
            {selectedAccountId && (
              <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                Filtered by selected account
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 font-mono hidden sm:inline">Showing last 10</span>
            <Link
              href="/finance/transactions"
              className="text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3.5 py-1.5 rounded-full transition-colors"
            >
              View all &rarr;
            </Link>
          </div>
        </div>

        {txnsLoading ? (
          <div className="divide-y divide-white/[0.05] p-6 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex justify-between items-center animate-pulse py-2">
                <div className="flex items-center gap-3 w-1/3">
                  <div className="w-10 h-10 rounded-full bg-white/10" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-6 bg-white/10 rounded w-20" />
              </div>
            ))}
          </div>
        ) : !txnData || txnData.items.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 text-sm flex flex-col items-center justify-center gap-3">
            <span>No transactions yet for this month</span>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black rounded-full text-xs font-bold transition-all shadow-md"
            >
              Add Transaction
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {txnData.items.map((txn) => {
              const isIncome = txn.type === "income";
              return (
                <div
                  key={txn.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors duration-150 gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Circular Icon Pill (Matching Reference) */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border bg-[#18181F] border-white/10 text-white/90">
                      {isIncome ? (
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <ShoppingBag className="h-4 w-4 text-neutral-300" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-white block truncate">
                        {txn.description || "Unlabeled Transaction"}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-neutral-400">{txn.category}</span>
                        {txn.is_included === false && (
                          <span className="text-[10px] font-mono font-medium px-2 py-0.2 rounded-full bg-white/5 border border-white/10 text-neutral-500">
                            Excluded
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <span
                      className={`text-sm sm:text-base font-bold font-sans tracking-tight ${
                        isIncome
                          ? "text-emerald-400"
                          : txn.is_included === false
                          ? "text-neutral-500 line-through"
                          : "text-white"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatCurrency(txn.amount_cents, "INR")}
                    </span>
                    <span className="text-[11px] text-neutral-500 font-medium">
                      {formatDate(txn.txn_date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
