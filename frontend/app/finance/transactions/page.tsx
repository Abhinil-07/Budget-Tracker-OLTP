"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import PageWrapper from "@/components/layout/PageWrapper";
import AccountCard from "@/components/accounts/AccountCard";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import EditTransactionModal from "@/components/transactions/EditTransactionModal";
import BulkImportModal from "@/components/transactions/BulkImportModal";
import { formatCurrency } from "@/lib/formatCurrency";
import { formatDate } from "@/lib/formatDate";
import { CATEGORIES } from "@/lib/constants";
import { api, ApiError } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  X,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Plus,
  Pencil,
  Upload,
  Download,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from "lucide-react";
import { Transaction } from "@/types/transaction";

// Animated Rolling Counter Component for the Loading Screen Balance Adjustment Effect
function AnimatedRollingBalance({
  targetCents,
  currency = "INR",
  duration = 1200,
}: {
  targetCents: number;
  currency?: string;
  duration?: number;
}) {
  const [currentCents, setCurrentCents] = useState(0);
  const [isAdjusted, setIsAdjusted] = useState(false);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animId: number;

    const step = (now: number) => {
      if (!startTimestamp) startTimestamp = now;
      const elapsed = now - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = Math.floor(ease * targetCents);
      setCurrentCents(val);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setCurrentCents(targetCents);
        setIsAdjusted(true);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [targetCents, duration]);

  return (
    <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
      <motion.div
        animate={isAdjusted ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-mono tracking-tight"
      >
        {formatCurrency(currentCents, currency)}
      </motion.div>
      {isAdjusted && (
        <motion.span
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-[9px] sm:text-[10px] font-sans font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap"
        >
          ✓ Adjusted
        </motion.span>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const { token, hydrated, hydrate } = useAuthStore();

  // Modals & Actions
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [deletingTxn, setDeletingTxn] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isExportingAll, setIsExportingAll] = useState(false);

  // Splash Loading Screen (plays smooth 2.4s intro animation on page entry)
  const [showIntroLoading, setShowIntroLoading] = useState(true);

  // Auto-dismiss intro animation after 2.4s
  useEffect(() => {
    if (!showIntroLoading) return;
    const timer = setTimeout(() => {
      setShowIntroLoading(false);
    }, 2400);
    return () => clearTimeout(timer);
  }, [showIntroLoading]);

  // Carousel Active Card Index (0 to accounts.length - 1) & Slide Direction (-1 or 1)
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<number>(0);
  const [isAllAccountsMode, setIsAllAccountsMode] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedIncluded, setSelectedIncluded] = useState<string>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("this-month");
  const [customDateFrom, setCustomDateFrom] = useState<string>("");
  const [customDateTo, setCustomDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Hydrate auth
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !token) {
      window.location.href = "/login";
    }
  }, [hydrated, token]);

  // Fetch accounts
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { categories } = useCategories();

  // Sync selected account with carousel index
  const activeAccount = useMemo(() => {
    if (accounts.length === 0) return null;
    const safeIndex = Math.min(Math.max(0, carouselIndex), accounts.length - 1);
    return accounts[safeIndex];
  }, [accounts, carouselIndex]);

  const selectedAccountId = useMemo(() => {
    if (isAllAccountsMode) return "";
    return activeAccount ? activeAccount.id : "";
  }, [isAllAccountsMode, activeAccount]);

  // Reset page when filters or card changes
  useEffect(() => {
    setPage(1);
  }, [
    carouselIndex,
    isAllAccountsMode,
    searchQuery,
    selectedCategory,
    selectedType,
    selectedIncluded,
    selectedDateRange,
    customDateFrom,
    customDateTo,
  ]);

  // Compute date boundaries
  const dateBounds = useMemo(() => {
    if (selectedDateRange === "all") {
      return { date_from: undefined, date_to: undefined };
    }

    const today = new Date();
    const formatDateObj = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    if (selectedDateRange === "last-7-days") {
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - 7);
      return { date_from: formatDateObj(pastDate), date_to: undefined };
    }

    if (selectedDateRange === "last-30-days") {
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - 30);
      return { date_from: formatDateObj(pastDate), date_to: undefined };
    }

    if (selectedDateRange === "this-month") {
      const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { date_from: formatDateObj(startOfThisMonth), date_to: formatDateObj(endOfThisMonth) };
    }

    if (selectedDateRange === "last-month") {
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return { date_from: formatDateObj(startOfLastMonth), date_to: formatDateObj(endOfLastMonth) };
    }

    if (selectedDateRange === "custom") {
      return {
        date_from: customDateFrom || undefined,
        date_to: customDateTo || undefined,
      };
    }

    return { date_from: undefined, date_to: undefined };
  }, [selectedDateRange, customDateFrom, customDateTo]);

  // Fetch paginated transactions for active account (or all)
  const transactionParams = useMemo(() => {
    return {
      page,
      page_size: pageSize,
      ...(selectedAccountId ? { account_id: selectedAccountId } : {}),
      ...(selectedCategory !== "all" ? { category: selectedCategory } : {}),
      ...(selectedType !== "all" ? { type: selectedType as any } : {}),
      ...(selectedIncluded !== "all" ? { is_included: selectedIncluded === "included" } : {}),
      ...(dateBounds.date_from ? { date_from: dateBounds.date_from } : {}),
      ...(dateBounds.date_to ? { date_to: dateBounds.date_to } : {}),
    };
  }, [page, selectedAccountId, selectedCategory, selectedType, selectedIncluded, pageSize, dateBounds]);

  const {
    data: txnData,
    isLoading: txnsLoading,
    error: txnsError,
  } = useTransactions(transactionParams);

  // Fetch all transactions for this account to compute chronological running balances
  const { data: allAccountTxns } = useTransactions(
    useMemo(
      () => ({
        account_id: selectedAccountId || undefined,
        page: 1,
        page_size: 10000,
      }),
      [selectedAccountId]
    )
  );

  // Calculate running balances
  const runningBalances = useMemo(() => {
    if (!activeAccount || !allAccountTxns || isAllAccountsMode) {
      return {};
    }

    const balancesMap: Record<string, number> = {};
    const sortedTxns = [...allAccountTxns.items].sort((a, b) => {
      const dateCompare = new Date(b.txn_date).getTime() - new Date(a.txn_date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    let currentBalance = activeAccount.balance_cents;

    for (let i = 0; i < sortedTxns.length; i++) {
      const txn = sortedTxns[i];
      balancesMap[txn.id] = currentBalance;

      const accType = activeAccount.type;
      let delta = 0;
      if (accType === "credit_card") {
        delta = txn.type === "expense" ? txn.amount_cents : -txn.amount_cents;
      } else {
        delta = txn.type === "income" ? txn.amount_cents : -txn.amount_cents;
      }

      currentBalance -= delta;
    }

    return balancesMap;
  }, [activeAccount, allAccountTxns, isAllAccountsMode]);

  // Monthly stats for the active account
  const cardMonthlyStats = useMemo(() => {
    if (!allAccountTxns?.items) return { spent: 0, income: 0 };
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    let spent = 0;
    let income = 0;

    allAccountTxns.items.forEach((item) => {
      const d = new Date(item.txn_date);
      if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
        if (item.type === "expense" && item.is_included !== false) {
          spent += item.amount_cents;
        } else if (item.type === "income") {
          income += item.amount_cents;
        }
      }
    });

    return { spent, income };
  }, [allAccountTxns]);

  // Client-side search filtering by description
  const filteredTxnItems = useMemo(() => {
    if (!txnData) return [];
    if (!searchQuery.trim()) return txnData.items;

    const lowerSearch = searchQuery.toLowerCase();
    return txnData.items.filter((txn) =>
      (txn.description || "").toLowerCase().includes(lowerSearch)
    );
  }, [txnData, searchQuery]);

  // Group transactions by date
  const groupedTxns = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTxnItems.forEach((txn) => {
      const date = txn.txn_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(txn);
    });
    return Object.entries(groups).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }, [filteredTxnItems]);

  // Delete transaction handler
  const handleConfirmDelete = async () => {
    if (!deletingTxn) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await api.transactions.delete(deletingTxn.id);
      if (res.error) throw new Error(res.error.message);

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["budget"] });

      setDeletingTxn(null);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Failed to delete transaction.";
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle included in budget
  const [togglingIncludedIds, setTogglingIncludedIds] = useState<Record<string, boolean>>({});
  const handleToggleInclude = async (txn: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = txn.is_included === false ? true : false;
    setTogglingIncludedIds((prev) => ({ ...prev, [txn.id]: true }));
    try {
      await api.transactions.update(txn.id, {
        is_included: newStatus,
      });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["budget"] });
    } catch (err) {
      console.error("Failed to update include status:", err);
      alert("Failed to update transaction inclusion status.");
    } finally {
      setTogglingIncludedIds((prev) => ({ ...prev, [txn.id]: false }));
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!txnData || txnData.items.length === 0) {
      alert("No transactions to export for this view.");
      return;
    }
    const headers = ["Date", "Description", "Category", "Type", "Amount (INR)", "Account", "Included in Budget"];
    const rows = txnData.items.map((txn) => {
      const acc = accounts.find((a) => a.id === txn.account_id);
      return [
        txn.txn_date,
        `"${(txn.description || "").replace(/"/g, '""')}"`,
        `"${txn.category.replace(/"/g, '""')}"`,
        txn.type,
        (txn.amount_cents / 100).toFixed(2),
        acc ? `"${acc.name.replace(/"/g, '""')}"` : "Unknown",
        txn.is_included !== false ? "TRUE" : "FALSE",
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      encodeURIComponent([headers.join(","), ...rows.map((e) => e.join(","))].join("\n"));

    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `transactions_${activeAccount?.name || "all"}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dump all expenses across all accounts
  const handleExportAllExpensesCSV = async () => {
    setIsExportingAll(true);
    try {
      const res = await api.transactions.list({
        type: "expense",
        page: 1,
        page_size: 10000,
      });

      const items = res?.data?.items || [];
      if (items.length === 0) {
        alert("No expense transactions found to export.");
        return;
      }

      const headers = ["Date", "Description", "Category", "Amount (INR)", "Account", "Account Type", "Included in Budget"];
      const rows = items.map((txn) => {
        const acc = accounts.find((a) => a.id === txn.account_id);
        return [
          txn.txn_date,
          `"${(txn.description || "").replace(/"/g, '""')}"`,
          `"${txn.category.replace(/"/g, '""')}"`,
          (txn.amount_cents / 100).toFixed(2),
          acc ? `"${acc.name.replace(/"/g, '""')}"` : "Unknown",
          acc?.type || "unknown",
          txn.is_included !== false ? "TRUE" : "FALSE",
        ];
      });

      const csvContent =
        "data:text/csv;charset=utf-8," +
        encodeURIComponent([headers.join(","), ...rows.map((e) => e.join(","))].join("\n"));

      const link = document.createElement("a");
      link.setAttribute("href", csvContent);
      link.setAttribute("download", `all_expenses_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export all failed:", err);
      alert("Failed to dump expenses CSV.");
    } finally {
      setIsExportingAll(false);
    }
  };

  // Handle Swipe navigation with directional tracking
  const handleSwipePrev = () => {
    if (carouselIndex > 0) {
      setSlideDirection(-1);
      setCarouselIndex((prev) => prev - 1);
      setIsAllAccountsMode(false);
    }
  };

  const handleSwipeNext = () => {
    if (carouselIndex < accounts.length - 1) {
      setSlideDirection(1);
      setCarouselIndex((prev) => prev + 1);
      setIsAllAccountsMode(false);
    }
  };

  const totalPages = txnData ? Math.ceil(txnData.total / pageSize) : 1;

  // If auth is not yet hydrated, render clean centered spinner inside PageWrapper
  if (!hydrated) {
    return (
      <PageWrapper title="Transactions">
        <div className="py-24 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white border-r-2 mb-3" />
          <span className="text-xs text-neutral-400">Loading transactions...</span>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Transactions"
      onAddTransactionClick={() => setShowAddModal(true)}
      actionLabel="Add Transaction"
    >
      {/* Animated Intro Cards Overlay (Seamless 2.4s presentation on page visit) */}
      <AnimatePresence>
        {showIntroLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowIntroLoading(false)}
            className="fixed inset-0 z-40 h-[100dvh] w-full bg-black/95 flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden select-none cursor-pointer"
          >
            {/* Ambient background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-cyan-500/10 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />
            <div className="absolute top-1/3 left-1/3 w-64 sm:w-80 h-64 sm:h-80 bg-violet-500/10 rounded-full blur-[90px] pointer-events-none" />

            {/* Stacked Fanning Animated Cards */}
            <div className="relative w-[280px] h-[175px] sm:w-[320px] sm:h-[196px] mb-8 sm:mb-10 flex items-center justify-center pointer-events-none">
              {/* Card 1: Sage Green (Bottom tilt left) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotate: -18, y: 25 }}
                animate={{ opacity: 0.65, scale: 0.9, rotate: -7, y: 10, x: -16 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute inset-0 rounded-[24px] sm:rounded-[28px] border border-[#8AA99E]/40 shadow-2xl p-4 sm:p-5 flex flex-col justify-between"
                style={{
                  background: "radial-gradient(125% 125% at 50% 50%, #050908 0%, #152722 65%, #76988C 100%)",
                }}
              >
                <div className="flex justify-between items-center text-[10px] text-white/50 font-bold uppercase tracking-wider">
                  <span>Digital Card</span>
                  <span>•••• 8421</span>
                </div>
                <div className="h-3 sm:h-4 w-24 sm:w-28 bg-white/20 rounded-full" />
              </motion.div>

              {/* Card 2: Royal Blue (Mid tilt right) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotate: 18, y: 18 }}
                animate={{ opacity: 0.75, scale: 0.95, rotate: 6, y: -6, x: 16 }}
                transition={{ duration: 0.9, delay: 0.1, ease: "easeOut" }}
                className="absolute inset-0 rounded-[24px] sm:rounded-[28px] border border-[#4A7CE0]/50 shadow-2xl p-4 sm:p-5 flex flex-col justify-between"
                style={{
                  background: "radial-gradient(125% 125% at 50% 50%, #02030B 0%, #0F2554 65%, #273A71 100%)",
                }}
              >
                <div className="flex justify-between items-center text-[10px] text-white/60 font-bold uppercase tracking-wider">
                  <span>Sapphire Reserve</span>
                  <span>•••• 4120</span>
                </div>
                <div className="h-3 sm:h-4 w-28 sm:w-32 bg-white/25 rounded-full" />
              </motion.div>

              {/* Card 3: Dusty Orchid Pink (Front center) */}
              {(() => {
                const introAccount = accounts.find((a) => a.balance_cents > 0) || accounts[0];
                const introBalance = introAccount ? introAccount.balance_cents : 56200;
                const introName = introAccount ? introAccount.name : "Active Card";
                const introLast4 = introAccount?.account_number ? introAccount.account_number.slice(-4) : "9012";
                const introCurr = introAccount?.currency || "INR";
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7, y: 35 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0, y: 0, x: 0 }}
                    transition={{ duration: 0.9, delay: 0.2, type: "spring", stiffness: 200 }}
                    className="absolute inset-0 rounded-[24px] sm:rounded-[28px] border border-[#D1699F]/70 shadow-[0_20px_50px_rgba(166,92,136,0.35)] p-4 sm:p-5 flex flex-col justify-between"
                    style={{
                      background: "radial-gradient(125% 125% at 50% 50%, #180611 0%, #4D0E34 65%, #A65C88 100%)",
                    }}
                  >
                    <div className="flex justify-between items-center text-[10px] sm:text-[11px] text-white/80 font-bold uppercase tracking-wider">
                      <span>Wallet Ledger</span>
                      <span>•••• {introLast4}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/60 block font-semibold uppercase mb-0.5">
                        {introName}
                      </span>
                      <AnimatedRollingBalance
                        targetCents={introBalance}
                        currency={introCurr}
                        duration={1200}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/30" />
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/15 -ml-2.5 sm:-ml-3" />
                    </div>
                  </motion.div>
                );
              })()}
            </div>

            {/* Text & Shimmer loader */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-center space-y-3 z-10 px-4 pointer-events-none"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs font-semibold text-white/90 shadow-md">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
                <span>Syncing Digital Cards & Ledger...</span>
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-400 max-w-xs mx-auto">
                Preparing your swipeable cards and chronological transaction ledger.
              </p>
            </motion.div>

            {/* Skip to Ledger button (Safe position above bottom dock on mobile) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowIntroLoading(false);
              }}
              className="absolute bottom-24 sm:bottom-6 right-5 sm:right-6 text-xs text-neutral-300 hover:text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md shadow-lg z-50 touch-manipulation"
            >
              <span>Skip to Ledger</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        defaultType="expense"
      />
      <EditTransactionModal
        isOpen={!!editingTxn}
        onClose={() => setEditingTxn(null)}
        transaction={editingTxn}
      />
      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
      />

      {/* Delete Confirmation Modal */}
      {deletingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121216] border border-white/10 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="h-6 w-6" />
              <h3 className="font-bold text-base text-white">Delete Transaction?</h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-bold text-white">
                "{deletingTxn.description || deletingTxn.category}"
              </span>{" "}
              for{" "}
              <span className="font-mono text-white">
                {formatCurrency(deletingTxn.amount_cents, "INR")}
              </span>
              ? This action cannot be undone.
            </p>
            {deleteError && (
              <div className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                {deleteError}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingTxn(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single-Flow Container inspired by reference video */}
      <div className="max-w-4xl mx-auto space-y-8 select-none">
        
        {/* ========================================================= */}
        {/* TOP SECTION: SWIPEABLE 3D CARDS CAROUSEL */}
        {/* ========================================================= */}
        {accountsLoading ? (
          <div className="py-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-md sm:max-w-lg h-[210px] rounded-[28px] sm:rounded-[32px] bg-[#121216] border border-white/10 p-5 sm:p-6 animate-pulse flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 bg-white/10 rounded-full" />
                <div className="h-3 w-16 bg-white/5 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-2.5 w-20 bg-white/5 rounded-full" />
                <div className="h-8 w-44 bg-white/10 rounded-full" />
                <div className="h-2.5 w-28 bg-white/5 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/10" />
                <div className="w-8 h-8 rounded-full bg-white/10" />
              </div>
            </div>
            <span className="text-xs text-neutral-400 mt-3 animate-pulse">
              Loading cards...
            </span>
          </div>
        ) : accounts.length > 0 ? (
          <div className="relative pt-2 pb-4">
            {/* Carousel Header & Quick Mode Toggles */}
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                  Select Card to Filter
                </span>
                <span className="text-[11px] font-semibold text-white/60">
                  ({carouselIndex + 1} of {accounts.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowIntroLoading(true)}
                  title="Replay intro animation"
                  className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Sparkles className="h-3 w-3 text-cyan-400" />
                </button>
              </div>

              {/* Toggle: Active Card vs All Accounts */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAllAccountsMode(false)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    !isAllAccountsMode
                      ? "bg-white text-black shadow-md"
                      : "bg-white/5 text-neutral-400 hover:text-white"
                  }`}
                >
                  By Card
                </button>
                <button
                  onClick={() => setIsAllAccountsMode(true)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isAllAccountsMode
                      ? "bg-white text-black shadow-md"
                      : "bg-white/5 text-neutral-400 hover:text-white"
                  }`}
                >
                  <Layers className="h-3 w-3" />
                  <span>All Accounts</span>
                </button>
              </div>
            </div>

            {/* Interactive Swipeable Stage */}
            <div className="relative flex items-center justify-center overflow-hidden py-4 px-2 sm:px-14">
              {/* Desktop Left Chevron Button */}
              {carouselIndex > 0 && (
                <button
                  onClick={handleSwipePrev}
                  className="absolute left-2 sm:left-4 z-30 w-11 h-11 rounded-full bg-black/70 hover:bg-black/95 border border-white/20 text-white flex items-center justify-center transition-all shadow-xl hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
                  title="Previous Card"
                >
                  <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
                </button>
              )}

              {/* Desktop Right Chevron Button */}
              {carouselIndex < accounts.length - 1 && (
                <button
                  onClick={handleSwipeNext}
                  className="absolute right-2 sm:right-4 z-30 w-11 h-11 rounded-full bg-black/70 hover:bg-black/95 border border-white/20 text-white flex items-center justify-center transition-all shadow-xl hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
                  title="Next Card"
                >
                  <ChevronRight className="h-6 w-6 stroke-[2.5]" />
                </button>
              )}

              {/* Active Center Card with Touch/Mouse Swipe Drag & Directional Slide */}
              <div className="w-full max-w-lg z-20 relative">
                <AnimatePresence initial={false} custom={slideDirection} mode="popLayout">
                  {activeAccount && (
                    <motion.div
                      key={activeAccount.id}
                      custom={slideDirection}
                      variants={{
                        enter: (dir: number) => ({
                          x: dir > 0 ? 320 : dir < 0 ? -320 : 0,
                          opacity: 0,
                          scale: 0.92,
                          rotateY: dir > 0 ? 12 : dir < 0 ? -12 : 0,
                        }),
                        center: {
                          x: 0,
                          opacity: 1,
                          scale: 1,
                          rotateY: 0,
                          transition: {
                            x: { type: "spring", stiffness: 320, damping: 28 },
                            opacity: { duration: 0.25 },
                            scale: { duration: 0.25 },
                          },
                        },
                        exit: (dir: number) => ({
                          x: dir < 0 ? 320 : -320,
                          opacity: 0,
                          scale: 0.92,
                          rotateY: dir < 0 ? 12 : -12,
                          transition: {
                            x: { type: "spring", stiffness: 320, damping: 28 },
                            opacity: { duration: 0.2 },
                          },
                        }),
                      }}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.25}
                      style={{ touchAction: "pan-y" }}
                      onDragEnd={(_, info) => {
                        const swipe = info.offset.x;
                        const velocity = info.velocity.x;
                        if ((swipe < -30 || velocity < -200) && carouselIndex < accounts.length - 1) {
                          handleSwipeNext();
                        } else if ((swipe > 30 || velocity > 200) && carouselIndex > 0) {
                          handleSwipePrev();
                        }
                      }}
                      className="cursor-grab active:cursor-grabbing w-full touch-manipulation"
                    >
                      <AccountCard
                        account={activeAccount}
                        colorIndex={carouselIndex}
                        spentThisMonthCents={cardMonthlyStats.spent}
                        isSelected={!isAllAccountsMode}
                        animateBalance={true}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Pagination Dots & Navigation Indicators */}
            <div className="flex items-center justify-center gap-2 mt-2">
              {accounts.map((acc, idx) => (
                <button
                  key={acc.id}
                  onClick={() => {
                    setCarouselIndex(idx);
                    setIsAllAccountsMode(false);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === carouselIndex && !isAllAccountsMode
                      ? "w-7 bg-white shadow-md shadow-white/30"
                      : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                  title={acc.name}
                />
              ))}
            </div>

            {/* Quick Action Pills for the Active Card */}
            <div className="flex items-center justify-center flex-wrap gap-2.5 mt-5">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-white hover:bg-neutral-100 text-black rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Add Entry</span>
              </button>

              <button
                onClick={() => setShowBulkImportModal(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer backdrop-blur-md"
              >
                <Upload className="h-3.5 w-3.5 text-white/80" />
                <span>Import CSV</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer backdrop-blur-md"
              >
                <Download className="h-3.5 w-3.5 text-white/80" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleExportAllExpensesCSV}
                disabled={isExportingAll}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                title="Download CSV of all expense transactions across all accounts"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-white/60" />
                <span>{isExportingAll ? "Exporting..." : "Dump All"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#121216] border border-white/10 p-10 rounded-3xl text-center space-y-3">
            <CreditCard className="h-10 w-10 text-neutral-500 mx-auto" />
            <h3 className="font-bold text-white text-base">No Accounts Connected</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Add your bank account or credit card in Accounts to see your interactive cards and statement ledger.
            </p>
          </div>
        )}

        {/* ========================================================= */}
        {/* MAIN SECTION: TRANSACTIONS FEED FOR ACTIVE CARD */}
        {/* ========================================================= */}
        <div className="space-y-4">
          
          {/* Header Row: Title & Active Context */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  {isAllAccountsMode
                    ? "All Account Transactions"
                    : `${activeAccount?.name || "Card"} Activity`}
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-white/80">
                  {txnData ? `${txnData.total} Total` : "..."}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isAllAccountsMode
                  ? "Showing all entries across all accounts"
                  : `Real-time activity ledger for ${activeAccount?.name || "this card"}`}
              </p>
            </div>

            {/* Quick Type Filter Segmented Pill */}
            <div className="inline-flex p-1 bg-white/5 border border-white/10 rounded-2xl">
              {(["all", "expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all ${
                    selectedType === t
                      ? "bg-white text-black shadow-md"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Bar: Search, Category, Date, Budget Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121216] border border-white/10 rounded-2xl pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-[#121216] border border-white/10 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Selector */}
            <div>
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="w-full bg-[#121216] border border-white/10 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
              >
                <option value="this-month">This Month</option>
                <option value="last-30-days">Last 30 Days</option>
                <option value="last-7-days">Last 7 Days</option>
                <option value="last-month">Last Month</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range...</option>
              </select>
            </div>

            {/* Budget Included Filter */}
            <div>
              <select
                value={selectedIncluded}
                onChange={(e) => setSelectedIncluded(e.target.value)}
                className="w-full bg-[#121216] border border-white/10 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
              >
                <option value="all">All Inclusion</option>
                <option value="included">Included in Budget</option>
                <option value="excluded">Excluded</option>
              </select>
            </div>
          </div>

          {/* Custom Date Pickers if selected */}
          {selectedDateRange === "custom" && (
            <div className="flex items-center gap-3 bg-[#121216] border border-white/10 p-3 rounded-2xl">
              <span className="text-xs text-neutral-400 font-medium">From:</span>
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
              />
              <span className="text-xs text-neutral-400 font-medium">To:</span>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>
          )}

          {/* Transactions List */}
          {txnsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-[#121216] border border-white/5 p-4 rounded-2xl h-16 animate-pulse flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-32 bg-white/10 rounded-full" />
                      <div className="h-2 w-20 bg-white/5 rounded-full" />
                    </div>
                  </div>
                  <div className="h-4 w-20 bg-white/10 rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredTxnItems.length === 0 ? (
            <div className="bg-[#121216] border border-white/10 p-12 rounded-3xl text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-neutral-400">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white text-base">No Transactions Found</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                No entries match the current filters for {activeAccount ? activeAccount.name : "this view"}.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-2 px-5 py-2.5 bg-white text-black font-bold text-xs rounded-2xl shadow-lg hover:bg-neutral-100 transition-all active:scale-95"
              >
                + Add Transaction
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedTxns.map(([date, txns]) => (
                <div key={date} className="space-y-2">
                  {/* Date Divider */}
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                      {formatDate(date)}
                    </span>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>

                  {/* Transaction Cards List */}
                  <div className="space-y-2">
                    {txns.map((txn) => {
                      const isExpense = txn.type === "expense";
                      const isToggling = togglingIncludedIds[txn.id];
                      const runningBal = runningBalances[txn.id];

                      const getCatEmoji = (catName: string) => {
                        const l = (catName || "").toLowerCase();
                        if (l.includes("food") || l.includes("dining")) return "🍔";
                        if (l.includes("transport")) return "🚗";
                        if (l.includes("grocer")) return "🛒";
                        if (l.includes("shop")) return "🛍️";
                        if (l.includes("entertain")) return "🎬";
                        if (l.includes("health")) return "💊";
                        if (l.includes("utilit")) return "⚡";
                        if (l.includes("rent")) return "🏠";
                        if (l.includes("salary")) return "💵";
                        if (l.includes("freelance")) return "💻";
                        if (l.includes("invest")) return "📈";
                        if (l.includes("transfer")) return "🔄";
                        return isExpense ? "💸" : "💰";
                      };

                      return (
                        <div
                          key={txn.id}
                          className="bg-[#101014] hover:bg-[#141418] border border-white/[0.08] hover:border-white/20 p-3.5 sm:p-4 rounded-2xl transition-all duration-200 flex items-center justify-between gap-3 group"
                        >
                          {/* Left: Category Icon & Details */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg flex-shrink-0">
                              {getCatEmoji(txn.category)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-cyan-300 transition-colors">
                                {txn.description || txn.category}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-neutral-400 font-medium">
                                  {txn.category}
                                </span>
                                {isAllAccountsMode && (
                                  <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.2 rounded-full border border-white/10">
                                    {accounts.find((a) => a.id === txn.account_id)?.name || "Card"}
                                  </span>
                                )}
                                {/* Budget Inclusion Toggle Button */}
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleInclude(txn, e)}
                                  disabled={isToggling}
                                  title="Toggle whether this transaction counts toward monthly budget"
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                                    txn.is_included !== false
                                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                                      : "bg-neutral-800 border-neutral-700 text-neutral-400 line-through"
                                  }`}
                                >
                                  {txn.is_included !== false ? "In Budget" : "Excluded"}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Right: Amount & Actions */}
                          <div className="flex items-center gap-3 flex-shrink-0 text-right">
                            <div>
                              <div
                                className={`font-mono text-sm sm:text-base font-extrabold ${
                                  isExpense ? "text-rose-400" : "text-emerald-400"
                                }`}
                              >
                                {isExpense ? "-" : "+"}
                                {formatCurrency(txn.amount_cents, "INR")}
                              </div>
                              {runningBal !== undefined && (
                                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                  Bal: {formatCurrency(runningBal, "INR")}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons (Edit / Delete) */}
                            <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditingTxn(txn)}
                                className="p-1.5 hover:bg-white/10 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                                title="Edit Transaction"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingTxn(txn);
                                  setDeleteError(null);
                                }}
                                className="p-1.5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                                title="Delete Transaction"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Pagination Row */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-white/10 px-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>

                  <span className="text-xs text-neutral-400 font-medium">
                    Page <span className="text-white font-bold">{page}</span> of{" "}
                    <span className="text-white font-bold">{totalPages}</span>
                  </span>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
