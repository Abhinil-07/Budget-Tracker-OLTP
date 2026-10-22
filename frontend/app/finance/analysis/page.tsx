"use client";

import React, { useState, useMemo, useEffect } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { useAuthStore } from "@/stores/useAuthStore";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { formatCurrency } from "@/lib/formatCurrency";
import AuthLoadingScreen from "@/components/auth/AuthLoadingScreen";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingDown,
  Calendar,
  Flame,
  CreditCard,
  Sparkles,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  Layers,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Wallet,
  Clock,
  Zap,
  Info,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Transaction } from "@/types/transaction";

// Category Color System with neon tints & shadows
const CATEGORY_THEMES: Record<
  string,
  { fill: string; stroke: string; text: string; bg: string; glow: string }
> = {
  "Food & Dining": {
    fill: "#F59E0B",
    stroke: "#D97706",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    glow: "rgba(245, 158, 11, 0.35)",
  },
  Transport: {
    fill: "#38BDF8",
    stroke: "#0284C7",
    text: "text-sky-400",
    bg: "bg-sky-500/10",
    glow: "rgba(56, 189, 248, 0.35)",
  },
  Shopping: {
    fill: "#EC4899",
    stroke: "#BE185D",
    text: "text-pink-400",
    bg: "bg-pink-500/10",
    glow: "rgba(236, 72, 153, 0.35)",
  },
  Grocery: {
    fill: "#10B981",
    stroke: "#059669",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    glow: "rgba(16, 185, 129, 0.35)",
  },
  Entertainment: {
    fill: "#A855F7",
    stroke: "#7E22CE",
    text: "text-purple-400",
    bg: "bg-purple-500/10",
    glow: "rgba(168, 85, 247, 0.35)",
  },
  Utilities: {
    fill: "#06B6D4",
    stroke: "#0891B2",
    text: "text-cyan-400",
    bg: "bg-cyan-500/10",
    glow: "rgba(6, 182, 212, 0.35)",
  },
  Healthcare: {
    fill: "#F43F5E",
    stroke: "#E11D48",
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    glow: "rgba(244, 63, 94, 0.35)",
  },
  Rent: {
    fill: "#6366F1",
    stroke: "#4338CA",
    text: "text-indigo-400",
    bg: "bg-indigo-500/10",
    glow: "rgba(99, 102, 241, 0.35)",
  },
  Investment: {
    fill: "#14B8A6",
    stroke: "#0D9488",
    text: "text-teal-400",
    bg: "bg-teal-500/10",
    glow: "rgba(20, 184, 166, 0.35)",
  },
  Transfer: {
    fill: "#94A3B8",
    stroke: "#64748B",
    text: "text-slate-400",
    bg: "bg-slate-500/10",
    glow: "rgba(148, 163, 184, 0.35)",
  },
  "Owed to Me": {
    fill: "#EAB308",
    stroke: "#CA8A04",
    text: "text-yellow-400",
    bg: "bg-yellow-500/10",
    glow: "rgba(234, 179, 8, 0.35)",
  },
  Other: {
    fill: "#71717A",
    stroke: "#52525B",
    text: "text-zinc-400",
    bg: "bg-zinc-500/10",
    glow: "rgba(113, 113, 122, 0.35)",
  },
};

const FALLBACK_PALETTE = [
  "#6366F1",
  "#EC4899",
  "#10B981",
  "#F59E0B",
  "#06B6D4",
  "#8B5CF6",
  "#F43F5E",
  "#14B8A6",
  "#3B82F6",
  "#EAB308",
];

function getCategoryColor(name: string, index = 0) {
  if (CATEGORY_THEMES[name]) return CATEGORY_THEMES[name];
  const color = FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
  return {
    fill: color,
    stroke: color,
    text: "text-white",
    bg: "bg-white/10",
    glow: `${color}55`,
  };
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SpendsAnalysisPage() {
  const { token, hydrated, hydrate } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Timeframe & Filter States
  const [timeRange, setTimeRange] = useState<
    "this_month" | "last_month" | "30_days" | "90_days" | "ytd" | "all_time"
  >("this_month");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [trendViewMode, setTrendViewMode] = useState<"daily" | "cumulative">("daily");
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  useEffect(() => {
    hydrate();
    setIsMounted(true);
  }, [hydrate]);

  // Auth gate
  useEffect(() => {
    if (hydrated && !token) {
      window.location.href = "/login";
    }
  }, [hydrated, token]);

  // Calculate Date Boundaries
  const dateBounds = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    const pad = (n: number) => String(n).padStart(2, "0");
    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    switch (timeRange) {
      case "this_month": {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        return { from: formatDate(start), to: formatDate(end), label: "This Month" };
      }
      case "last_month": {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        return {
          from: formatDate(start),
          to: formatDate(end),
          label: new Date(year, month - 1, 1).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          }),
        };
      }
      case "30_days": {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { from: formatDate(start), to: formatDate(now), label: "Past 30 Days" };
      }
      case "90_days": {
        const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return { from: formatDate(start), to: formatDate(now), label: "Past 90 Days" };
      }
      case "ytd": {
        const start = new Date(year, 0, 1);
        return { from: formatDate(start), to: formatDate(now), label: `${year} YTD` };
      }
      case "all_time":
      default:
        return { from: undefined, to: undefined, label: "All Time" };
    }
  }, [timeRange]);

  // Fetch Accounts
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();

  const accountMap = useMemo(() => {
    const map = new Map<string, { name: string; type: string }>();
    accounts.forEach((acc) => {
      map.set(acc.id, { name: acc.name, type: acc.type });
    });
    return map;
  }, [accounts]);

  // Fetch Transactions (Included Expenses Only)
  const txnQueryParams = useMemo(() => {
    return {
      type: "expense" as const,
      is_included: true,
      page_size: 1000,
      ...(dateBounds.from ? { date_from: dateBounds.from } : {}),
      ...(dateBounds.to ? { date_to: dateBounds.to } : {}),
      ...(selectedAccountId !== "all" ? { account_id: selectedAccountId } : {}),
    };
  }, [dateBounds, selectedAccountId]);

  const {
    data: txnResponse,
    isLoading: txnsLoading,
    refetch,
    isRefetching,
  } = useTransactions(txnQueryParams);

  const rawTransactions = useMemo(() => {
    return txnResponse?.items || [];
  }, [txnResponse]);

  // Filtered by selectedCategory if active
  const filteredTransactions = useMemo(() => {
    if (!selectedCategory) return rawTransactions;
    return rawTransactions.filter((t) => t.category === selectedCategory);
  }, [rawTransactions, selectedCategory]);

  // Aggregate Metrics & Analytics
  const analytics = useMemo(() => {
    let totalSpendCents = 0;
    const categoryTotals: Record<
      string,
      { amountCents: number; count: number; txns: Transaction[] }
    > = {};
    const dateMap = new Map<
      string,
      { amountCents: number; count: number; largestTxn?: Transaction }
    >();
    const dayOfWeekMap = [0, 1, 2, 3, 4, 5, 6].map((dayIdx) => ({
      day: DAY_NAMES[dayIdx],
      totalCents: 0,
      count: 0,
    }));
    const accountSpendMap: Record<string, number> = {};

    let peakDay = { date: "", amountCents: 0, label: "" };
    let largestSingleTxn: Transaction | null = null;

    rawTransactions.forEach((txn) => {
      const cents = txn.amount_cents;
      totalSpendCents += cents;

      // Category breakdown
      const cat = txn.category || "Other";
      if (!categoryTotals[cat]) {
        categoryTotals[cat] = { amountCents: 0, count: 0, txns: [] };
      }
      categoryTotals[cat].amountCents += cents;
      categoryTotals[cat].count += 1;
      categoryTotals[cat].txns.push(txn);

      // Date breakdown
      const dateStr = txn.txn_date;
      const curDateEntry = dateMap.get(dateStr) || { amountCents: 0, count: 0 };
      const newDateTotal = curDateEntry.amountCents + cents;
      const largestInDay =
        !curDateEntry.largestTxn || cents > curDateEntry.largestTxn.amount_cents
          ? txn
          : curDateEntry.largestTxn;

      dateMap.set(dateStr, {
        amountCents: newDateTotal,
        count: curDateEntry.count + 1,
        largestTxn: largestInDay,
      });

      if (newDateTotal > peakDay.amountCents) {
        peakDay = {
          date: dateStr,
          amountCents: newDateTotal,
          label: new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
        };
      }

      // Largest single transaction
      if (!largestSingleTxn || cents > largestSingleTxn.amount_cents) {
        largestSingleTxn = txn;
      }

      // Day of week
      const dateObj = new Date(dateStr + "T00:00:00");
      const dayIdx = dateObj.getDay();
      if (!isNaN(dayIdx) && dayOfWeekMap[dayIdx]) {
        dayOfWeekMap[dayIdx].totalCents += cents;
        dayOfWeekMap[dayIdx].count += 1;
      }

      // Account breakdown
      accountSpendMap[txn.account_id] = (accountSpendMap[txn.account_id] || 0) + cents;
    });

    // Ranked Categories
    const categoryList = Object.entries(categoryTotals)
      .map(([name, data], idx) => {
        const theme = getCategoryColor(name, idx);
        const percent = totalSpendCents > 0 ? (data.amountCents / totalSpendCents) * 100 : 0;
        return {
          name,
          amountCents: data.amountCents,
          count: data.count,
          percent: Number(percent.toFixed(1)),
          theme,
        };
      })
      .sort((a, b) => b.amountCents - a.amountCents);

    // Sorted Timeline Array
    const sortedDateKeys = Array.from(dateMap.keys()).sort();
    let runningCumulativeCents = 0;
    const timelineData = sortedDateKeys.map((dateStr) => {
      const entry = dateMap.get(dateStr)!;
      runningCumulativeCents += entry.amountCents;
      const d = new Date(dateStr + "T00:00:00");
      const formattedLabel = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      return {
        date: dateStr,
        label: formattedLabel,
        amount: Number((entry.amountCents / 100).toFixed(2)),
        amountCents: entry.amountCents,
        cumulative: Number((runningCumulativeCents / 100).toFixed(2)),
        cumulativeCents: runningCumulativeCents,
        count: entry.count,
        largestTxn: entry.largestTxn,
      };
    });

    // Account allocation array
    const accountAllocation = Object.entries(accountSpendMap)
      .map(([accId, cents]) => {
        const accInfo = accountMap.get(accId);
        const percent = totalSpendCents > 0 ? (cents / totalSpendCents) * 100 : 0;
        return {
          id: accId,
          name: accInfo?.name || "Account",
          type: accInfo?.type || "savings",
          amountCents: cents,
          percent: Number(percent.toFixed(1)),
        };
      })
      .sort((a, b) => b.amountCents - a.amountCents);

    // Average spend calculations
    const activeDaysCount = dateMap.size || 1;
    const avgDailySpendCents = Math.round(totalSpendCents / activeDaysCount);
    const avgTxnSizeCents =
      rawTransactions.length > 0 ? Math.round(totalSpendCents / rawTransactions.length) : 0;

    // Peak day of week
    const peakDayOfWeek = [...dayOfWeekMap].sort(
      (a, b) => b.totalCents - a.totalCents
    )[0] || { day: "N/A", totalCents: 0, count: 0 };

    return {
      totalSpendCents,
      txnTotalCount: rawTransactions.length,
      categoryList,
      timelineData,
      dayOfWeekData: dayOfWeekMap.map((d) => ({
        ...d,
        amount: Number((d.totalCents / 100).toFixed(2)),
      })),
      accountAllocation,
      peakDay,
      peakDayOfWeek,
      largestSingleTxn,
      avgDailySpendCents,
      avgTxnSizeCents,
      activeDaysCount,
    };
  }, [rawTransactions, accountMap]);

  // Top Transactions Leaderboard
  const topTransactions = useMemo(() => {
    return [...filteredTransactions]
      .sort((a, b) => b.amount_cents - a.amount_cents)
      .slice(0, 7);
  }, [filteredTransactions]);

  if (!hydrated || !token) {
    return <AuthLoadingScreen statusMessage="Preparing spending analytics & charts..." />;
  }

  return (
    <PageWrapper
      title="Spends Analysis"
      actionLabel="Log Spend"
      onAddTransactionClick={() => setIsAddModalOpen(true)}
    >
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultType="expense"
      />

      {/* Control Header & Filter Bar */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-surface/80 via-surface/60 to-surface/90 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <BarChart3 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Expense Intelligence
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15">
                    Live Telemetry
                  </span>
                </h2>
                <p className="text-xs text-text-muted">
                  Interactive breakdowns, run-rates, and behavioral patterns
                </p>
              </div>
            </div>
          </div>

          {/* Timeframe & Account Selectors */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Account Selector Pill */}
            <div className="relative flex items-center bg-[#121216] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-text-secondary focus-within:border-white/30 transition-all">
              <Wallet className="h-3.5 w-3.5 mr-2 text-text-muted shrink-0" />
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-2 appearance-none text-xs"
              >
                <option value="all" className="bg-[#121216] text-white">
                  All Accounts ({accounts.length})
                </option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-[#121216] text-white">
                    {acc.name} ({acc.type === "credit_card" ? "Credit Card" : "Bank"})
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-white hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Refresh Analytics"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Time Range Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "this_month", label: "This Month" },
            { id: "last_month", label: "Last Month" },
            { id: "30_days", label: "Past 30 Days" },
            { id: "90_days", label: "Past 90 Days" },
            { id: "ytd", label: "Year to Date" },
            { id: "all_time", label: "All Time" },
          ].map((pill) => {
            const isActive = timeRange === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => {
                  setTimeRange(pill.id as any);
                  setSelectedCategory(null);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 border ${
                  isActive
                    ? "bg-white text-black border-white shadow-lg shadow-white/10 font-bold"
                    : "bg-surface/90 text-text-secondary border-white/5 hover:border-white/20 hover:text-white hover:bg-surface-raised"
                }`}
              >
                {pill.label}
              </button>
            );
          })}

          {/* Active Category Filter Tag */}
          <AnimatePresence>
            {selectedCategory && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold whitespace-nowrap"
              >
                <span>Category: {selectedCategory}</span>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="p-0.5 rounded-full hover:bg-cyan-500/20 text-cyan-300 hover:text-white transition-colors cursor-pointer"
                  title="Clear Category Filter"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Key Analytical Metric Tiles */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Spend */}
        <div className="bg-surface/90 rounded-2xl p-5 border border-white/10 relative overflow-hidden backdrop-blur-xl group hover:border-white/20 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/15 transition-all" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold">
              Total Outflows
            </span>
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <TrendingDown className="h-4 w-4" />
            </span>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-tight">
            {formatCurrency(analytics.totalSpendCents, "INR")}
          </div>
          <div className="mt-2 text-xs text-text-secondary flex items-center gap-1 font-mono">
            <span className="text-cyan-400 font-bold">
              {formatCurrency(analytics.avgDailySpendCents, "INR")}
            </span>
            <span className="text-text-muted">/ day active ({analytics.activeDaysCount} days)</span>
          </div>
        </div>

        {/* Metric 2: Top Expense Category */}
        <div className="bg-surface/90 rounded-2xl p-5 border border-white/10 relative overflow-hidden backdrop-blur-xl group hover:border-white/20 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/15 transition-all" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold">
              Top Category
            </span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <PieIcon className="h-4 w-4" />
            </span>
          </div>
          {analytics.categoryList.length > 0 ? (
            <>
              <div className="text-xl sm:text-2xl font-black text-white truncate tracking-tight">
                {analytics.categoryList[0].name}
              </div>
              <div className="mt-2 text-xs text-text-secondary flex items-center justify-between font-mono">
                <span className="text-amber-400 font-bold">
                  {formatCurrency(analytics.categoryList[0].amountCents, "INR")}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold text-[10px] border border-amber-500/20">
                  {analytics.categoryList[0].percent}% of total
                </span>
              </div>
            </>
          ) : (
            <div className="text-sm text-text-muted py-2">No category data</div>
          )}
        </div>

        {/* Metric 3: Peak Burning Day */}
        <div className="bg-surface/90 rounded-2xl p-5 border border-white/10 relative overflow-hidden backdrop-blur-xl group hover:border-white/20 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-rose-500/15 transition-all" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold">
              Peak Day
            </span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <Flame className="h-4 w-4" />
            </span>
          </div>
          {analytics.peakDay.amountCents > 0 ? (
            <>
              <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-tight">
                {analytics.peakDay.label}
              </div>
              <div className="mt-2 text-xs text-text-secondary flex items-center justify-between font-mono">
                <span className="text-rose-400 font-bold">
                  {formatCurrency(analytics.peakDay.amountCents, "INR")}
                </span>
                <span className="text-text-muted text-[11px]">Highest single day</span>
              </div>
            </>
          ) : (
            <div className="text-sm text-text-muted py-2">No spend recorded</div>
          )}
        </div>

        {/* Metric 4: Spend Velocity */}
        <div className="bg-surface/90 rounded-2xl p-5 border border-white/10 relative overflow-hidden backdrop-blur-xl group hover:border-white/20 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/15 transition-all" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold">
              Velocity & Size
            </span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Zap className="h-4 w-4" />
            </span>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-tight">
            {analytics.txnTotalCount}{" "}
            <span className="text-sm font-medium text-text-muted">entries</span>
          </div>
          <div className="mt-2 text-xs text-text-secondary flex items-center justify-between font-mono">
            <span className="text-purple-400 font-bold">
              ~{formatCurrency(analytics.avgTxnSizeCents, "INR")}
            </span>
            <span className="text-text-muted text-[11px]">avg per swipe</span>
          </div>
        </div>
      </section>

      {/* Main Charts Section */}
      {analytics.totalSpendCents === 0 && !txnsLoading ? (
        <div className="bg-surface/60 border border-white/10 rounded-3xl p-12 text-center backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-text-muted">
            <BarChart3 className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No expenses in this timeframe</h3>
          <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
            There are no recorded expense transactions matching the selected filters. Log a new
            expense or expand your date range to view analytics.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-full bg-white text-black text-xs font-bold shadow-lg shadow-white/10 hover:bg-neutral-100 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Log New Expense
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Chart 1: Spend Timeline & Burn Rate */}
          <div className="bg-surface/90 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Spending Trajectory
                  </h3>
                  {selectedCategory && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                      Filtered: {selectedCategory}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted">
                  {trendViewMode === "daily"
                    ? "Daily expenditure spikes and activity intensity"
                    : "Cumulative burn rate over the selected timeframe"}
                </p>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-[#121216] p-1 rounded-xl border border-white/10 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTrendViewMode("daily")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    trendViewMode === "daily"
                      ? "bg-white text-black font-bold shadow-sm"
                      : "text-text-muted hover:text-white"
                  }`}
                >
                  Daily Spikes
                </button>
                <button
                  type="button"
                  onClick={() => setTrendViewMode("cumulative")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    trendViewMode === "cumulative"
                      ? "bg-white text-black font-bold shadow-sm"
                      : "text-text-muted hover:text-white"
                  }`}
                >
                  Cumulative Burn
                </button>
              </div>
            </div>

            {/* Recharts Timeline */}
            <div className="h-[280px] sm:h-[320px] w-full min-w-0">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  {trendViewMode === "daily" ? (
                    <BarChart
                      data={analytics.timelineData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#27272A"
                        vertical={false}
                        opacity={0.4}
                      />
                      <XAxis
                        dataKey="label"
                        stroke="#71717A"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: "#27272A" }}
                        fontFamily="monospace"
                      />
                      <YAxis
                        stroke="#71717A"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        fontFamily="monospace"
                        tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#121216]/95 border border-white/15 p-3 rounded-2xl shadow-2xl backdrop-blur-2xl text-xs space-y-1.5 min-w-[180px]">
                              <div className="text-[10px] uppercase font-mono tracking-wider text-text-muted border-b border-white/10 pb-1">
                                {data.date}
                              </div>
                              <div className="flex items-center justify-between font-mono pt-0.5">
                                <span className="text-text-secondary">Total Spent:</span>
                                <span className="font-extrabold text-cyan-400">
                                  {formatCurrency(data.amountCents, "INR")}
                                </span>
                              </div>
                              <div className="flex items-center justify-between font-mono text-[11px] text-text-muted">
                                <span>Transactions:</span>
                                <span>{data.count}</span>
                              </div>
                              {data.largestTxn && (
                                <div className="mt-1 pt-1 border-t border-white/5 text-[10px] text-text-muted truncate">
                                  Top:{" "}
                                  <span className="text-white">
                                    {data.largestTxn.description || data.largestTxn.category}
                                  </span>{" "}
                                  ({formatCurrency(data.largestTxn.amount_cents, "INR")})
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="amount"
                        fill="url(#barGradient)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  ) : (
                    <AreaChart
                      data={analytics.timelineData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="burnGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#27272A"
                        vertical={false}
                        opacity={0.4}
                      />
                      <XAxis
                        dataKey="label"
                        stroke="#71717A"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: "#27272A" }}
                        fontFamily="monospace"
                      />
                      <YAxis
                        stroke="#71717A"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        fontFamily="monospace"
                        tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#121216]/95 border border-white/15 p-3 rounded-2xl shadow-2xl backdrop-blur-2xl text-xs space-y-1.5 min-w-[180px]">
                              <div className="text-[10px] uppercase font-mono tracking-wider text-text-muted border-b border-white/10 pb-1">
                                {data.date}
                              </div>
                              <div className="flex items-center justify-between font-mono pt-0.5">
                                <span className="text-text-secondary">Cumulative Spend:</span>
                                <span className="font-extrabold text-purple-400">
                                  {formatCurrency(data.cumulativeCents, "INR")}
                                </span>
                              </div>
                              <div className="flex items-center justify-between font-mono text-[11px] text-text-muted">
                                <span>Day Outflow:</span>
                                <span>{formatCurrency(data.amountCents, "INR")}</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        stroke="#A855F7"
                        strokeWidth={2.5}
                        fill="url(#burnGradient)"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Grid Layout: Donut Breakdown + Day of Week Behavior */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Donut & Category Ranking (7 Columns on LG) */}
            <div className="lg:col-span-7 bg-surface/90 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-2xl shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Category Breakdown
                  </h3>
                  <p className="text-xs text-text-muted">
                    Click any slice or category to filter timeline insights
                  </p>
                </div>
                {selectedCategory && (
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Donut + Center Stat */}
              <div className="flex flex-col sm:flex-row items-center gap-6 min-w-0">
                <div className="relative w-[210px] h-[210px] shrink-0 flex items-center justify-center">
                  {isMounted && (
                    <PieChart width={210} height={210}>
                      <Pie
                          data={analytics.categoryList}
                          dataKey="amountCents"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={68}
                          outerRadius={95}
                          paddingAngle={3}
                          onClick={(entry) => {
                            setSelectedCategory(
                              selectedCategory === entry.name ? null : entry.name
                            );
                          }}
                          onMouseEnter={(_, index) => setActivePieIndex(index)}
                          onMouseLeave={() => setActivePieIndex(null)}
                          cursor="pointer"
                        >
                          {analytics.categoryList.map((entry, index) => {
                            const isSelected = selectedCategory === entry.name;
                            const isHovered = activePieIndex === index;
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.theme.fill}
                                stroke={isSelected || isHovered ? "#FFFFFF" : "rgba(0,0,0,0.5)"}
                                strokeWidth={isSelected ? 3 : 1}
                                style={{
                                  filter:
                                    isSelected || isHovered
                                      ? `drop-shadow(0px 0px 8px ${entry.theme.glow})`
                                      : "none",
                                  transition: "all 0.2s ease",
                                }}
                              />
                            );
                          })}
                        </Pie>
                      </PieChart>
                  )}

                  {/* Donut Center Display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                    {activePieIndex !== null && analytics.categoryList[activePieIndex] ? (
                      <>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted truncate max-w-[120px]">
                          {analytics.categoryList[activePieIndex].name}
                        </span>
                        <span className="font-mono text-sm font-extrabold text-white">
                          {analytics.categoryList[activePieIndex].percent}%
                        </span>
                      </>
                    ) : selectedCategory ? (
                      <>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 truncate max-w-[120px]">
                          {selectedCategory}
                        </span>
                        <span className="font-mono text-xs font-bold text-white">Selected</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                          Categories
                        </span>
                        <span className="font-mono text-base font-extrabold text-white">
                          {analytics.categoryList.length}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Ranked Category Progress Bars */}
                <div className="flex-1 w-full space-y-2.5 overflow-y-auto max-h-[260px] pr-1">
                  {analytics.categoryList.map((cat, idx) => {
                    const isSelected = selectedCategory === cat.name;
                    return (
                      <div
                        key={cat.name}
                        onClick={() =>
                          setSelectedCategory(selectedCategory === cat.name ? null : cat.name)
                        }
                        className={`group p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-white/10 border-white text-white shadow-md"
                            : "bg-[#121216]/60 border-white/5 hover:border-white/15 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: cat.theme.fill }}
                            />
                            <span className="truncate text-white font-semibold">{cat.name}</span>
                            <span className="text-[10px] text-text-muted font-mono">
                              ({cat.count} txns)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono shrink-0">
                            <span className="text-white font-bold">
                              {formatCurrency(cat.amountCents, "INR")}
                            </span>
                            <span className="text-text-muted text-[11px] w-10 text-right">
                              {cat.percent}%
                            </span>
                          </div>
                        </div>

                        {/* Progress track */}
                        <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${cat.percent}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.05 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: cat.theme.fill }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Day of Week Habits & Account Breakdown (5 Columns on LG) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Day of Week Chart */}
              <div className="bg-surface/90 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-2xl shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Weekly Rhythm
                    </h3>
                    <p className="text-xs text-text-muted">Habitual spend density by weekday</p>
                  </div>
                  {analytics.peakDayOfWeek.totalCents > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                      Peak: {analytics.peakDayOfWeek.day}
                    </span>
                  )}
                </div>

                <div className="h-[180px] w-full min-w-0">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.dayOfWeekData}
                        margin={{ top: 5, right: 0, left: -25, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#27272A"
                          vertical={false}
                          opacity={0.3}
                        />
                        <XAxis
                          dataKey="day"
                          stroke="#71717A"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: "#27272A" }}
                          fontFamily="monospace"
                        />
                        <YAxis
                          stroke="#71717A"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          fontFamily="monospace"
                          tickFormatter={(val) =>
                            `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                          }
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-[#121216]/95 border border-white/15 p-2.5 rounded-xl shadow-2xl backdrop-blur-xl text-xs space-y-1">
                                <div className="font-bold text-white">{d.day}s</div>
                                <div className="font-mono text-cyan-400 font-extrabold">
                                  {formatCurrency(d.totalCents, "INR")}
                                </div>
                                <div className="text-[10px] text-text-muted font-mono">
                                  {d.count} transactions recorded
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                          {analytics.dayOfWeekData.map((entry, index) => {
                            const isPeak = entry.day === analytics.peakDayOfWeek.day;
                            return (
                              <Cell
                                key={`cell-dow-${index}`}
                                fill={isPeak ? "#F59E0B" : "#6366F1"}
                                opacity={isPeak ? 1 : 0.75}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Account / Payment Source Footprint */}
              <div className="bg-surface/90 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-2xl shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Outflows by Account
                    </h3>
                    <p className="text-xs text-text-muted">Debit vs Credit card burn</p>
                  </div>
                  <CreditCard className="h-4 w-4 text-text-muted" />
                </div>

                <div className="space-y-3">
                  {analytics.accountAllocation.map((acc) => (
                    <div key={acc.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              acc.type === "credit_card" ? "bg-amber-400" : "bg-cyan-400"
                            }`}
                          />
                          <span className="text-white font-medium truncate">{acc.name}</span>
                          <span className="text-[10px] text-text-muted uppercase">
                            ({acc.type === "credit_card" ? "Credit" : "Bank"})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-white font-bold">
                            {formatCurrency(acc.amountCents, "INR")}
                          </span>
                          <span className="text-text-muted text-[11px] w-9 text-right">
                            {acc.percent}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            acc.type === "credit_card"
                              ? "bg-gradient-to-r from-amber-500 to-rose-500"
                              : "bg-gradient-to-r from-cyan-500 to-blue-500"
                          }`}
                          style={{ width: `${acc.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top Transactions Leaderboard */}
          <div className="bg-surface/90 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  High-Impact Expenses
                </h3>
                <p className="text-xs text-text-muted">
                  Largest individual spending events in this period
                </p>
              </div>
              <span className="text-xs font-mono text-text-muted">
                Showing top {topTransactions.length}
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {topTransactions.map((t, idx) => {
                const theme = getCategoryColor(t.category, idx);
                const acc = accountMap.get(t.account_id);
                const shareOfTotal =
                  analytics.totalSpendCents > 0
                    ? ((t.amount_cents / analytics.totalSpendCents) * 100).toFixed(1)
                    : "0";

                return (
                  <div
                    key={t.id}
                    className="py-3 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-mono font-bold text-xs text-text-muted shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {t.description || t.category}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-text-muted font-mono mt-0.5">
                          <span>{t.txn_date}</span>
                          <span>•</span>
                          <span
                            className="inline-flex items-center gap-1 font-semibold"
                            style={{ color: theme.fill }}
                          >
                            {t.category}
                          </span>
                          {acc && (
                            <>
                              <span>•</span>
                              <span className="truncate">{acc.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <div className="text-sm sm:text-base font-extrabold text-white">
                        {formatCurrency(t.amount_cents, "INR")}
                      </div>
                      <div className="text-[10px] text-text-muted">
                        {shareOfTotal}% of total spend
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
