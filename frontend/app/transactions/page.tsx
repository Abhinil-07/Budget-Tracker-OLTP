"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { useAccounts } from "../../hooks/useAccounts";
import { useTransactions } from "../../hooks/useTransactions";
import PageWrapper from "../../components/layout/PageWrapper";
import AddTransactionModal from "../../components/transactions/AddTransactionModal";
import EditTransactionModal from "../../components/transactions/EditTransactionModal";
import { formatCurrency } from "../../lib/formatCurrency";
import { formatDate } from "../../lib/formatDate";
import { CATEGORIES } from "../../lib/constants";
import type { AccountType } from "../../lib/constants";
import { api, ApiError } from "../../lib/api";
import { useQueryClient } from "@tanstack/react-query";
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
  Landmark,
  Briefcase,
  CreditCard,
  Copy,
  ArrowLeft,
  MoreVertical,
  EyeOff,
  ArrowUpDown,
  RefreshCw,
  Plus,
  Pencil,
} from "lucide-react";
import { Transaction } from "../../types/transaction";

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const { token, hydrated, hydrate } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);

  // States for selected account, filters, search, and page navigation
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
  const [customDateFrom, setCustomDateFrom] = useState<string>("");
  const [customDateTo, setCustomDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"statement" | "get-statement">("statement");
  const [showSearchInHeader, setShowSearchInHeader] = useState(false);
  const [showThreeDotsMenu, setShowThreeDotsMenu] = useState(false);
  const [statementDateFrom, setStatementDateFrom] = useState("");
  const [statementDateTo, setStatementDateTo] = useState("");
  const [exportFormat, setExportFormat] = useState("csv");
  const pageSize = 15;

  // Confirm delete dialog state
  const [deletingTxn, setDeletingTxn] = useState<Transaction | null>(null);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
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
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();

  // Select the first account by default on load
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedAccountId, searchQuery, selectedCategory, selectedType, selectedDateRange, customDateFrom, customDateTo]);

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
      return { date_from: formatDateObj(startOfThisMonth), date_to: undefined };
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

  // Fetch paginated transactions with filters
  const transactionParams = useMemo(() => {
    return {
      page,
      page_size: pageSize,
      ...(selectedAccountId ? { account_id: selectedAccountId } : {}),
      ...(selectedCategory !== "all" ? { category: selectedCategory } : {}),
      ...(selectedType !== "all" ? { type: selectedType as any } : {}),
      ...(dateBounds.date_from ? { date_from: dateBounds.date_from } : {}),
      ...(dateBounds.date_to ? { date_to: dateBounds.date_to } : {}),
    };
  }, [page, selectedAccountId, selectedCategory, selectedType, pageSize, dateBounds]);

  const {
    data: txnData,
    isLoading: txnsLoading,
    error: txnsError,
  } = useTransactions(transactionParams);

  // Fetch ALL transactions for the selected account to compute accurate running balances
  const { data: allAccountTxns } = useTransactions(
    useMemo(() => ({
      account_id: selectedAccountId || undefined,
      page: 1,
      page_size: 10000, // Load all to compute complete chronological ledger
    }), [selectedAccountId])
  );

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  // Calculate client-side running balances mapping each transaction ID to its balance after
  const runningBalances = useMemo(() => {
    if (!selectedAccount || !allAccountTxns) {
      return {};
    }

    const balancesMap: Record<string, number> = {};
    const sortedTxns = [...allAccountTxns.items].sort((a, b) => {
      const dateCompare = new Date(b.txn_date).getTime() - new Date(a.txn_date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    let currentBalance = selectedAccount.balance_cents;

    for (let i = 0; i < sortedTxns.length; i++) {
      const txn = sortedTxns[i];
      balancesMap[txn.id] = currentBalance;

      const accType = selectedAccount.type;
      let delta = 0;
      if (accType === "credit_card") {
        delta = txn.type === "expense" ? txn.amount_cents : -txn.amount_cents;
      } else {
        delta = txn.type === "income" ? txn.amount_cents : -txn.amount_cents;
      }

      currentBalance -= delta;
    }

    return balancesMap;
  }, [selectedAccount, allAccountTxns]);

  // Filter items client-side by description if searchQuery is active
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

  const handleDeleteClick = (txn: Transaction) => {
    setDeletingTxn(txn);
    setDeleteError(null);
  };

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

  const handleExportCSV = () => {
    if (!txnData || txnData.items.length === 0) return;
    const headers = ["Date", "Description", "Category", "Type", "Amount (INR)", "Account"];
    const rows = txnData.items.map((txn) => {
      const acc = accounts.find((a) => a.id === txn.account_id);
      return [
        txn.txn_date,
        `"${txn.description || ""}"`,
        txn.category,
        txn.type,
        (txn.amount_cents / 100).toFixed(2),
        acc ? `"${acc.name}"` : "Unknown",
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCustomStatement = () => {
    if (!txnData || txnData.items.length === 0) return;
    
    // Filter items based on date range
    let itemsToExport = txnData.items;
    if (statementDateFrom) {
      const fromDate = new Date(statementDateFrom);
      itemsToExport = itemsToExport.filter(txn => new Date(txn.txn_date) >= fromDate);
    }
    if (statementDateTo) {
      const toDate = new Date(statementDateTo);
      itemsToExport = itemsToExport.filter(txn => new Date(txn.txn_date) <= toDate);
    }

    if (exportFormat === "json") {
      const jsonContent = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(itemsToExport, null, 2));
      const link = document.createElement("a");
      link.setAttribute("href", jsonContent);
      link.setAttribute("download", `statement_${selectedAccount?.name || "account"}_${new Date().toISOString().split("T")[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // CSV format
      const headers = ["Date", "Description", "Category", "Type", "Amount (INR)", "Account"];
      const rows = itemsToExport.map((txn) => {
        const acc = accounts.find((a) => a.id === txn.account_id);
        return [
          txn.txn_date,
          `"${txn.description || ""}"`,
          txn.category,
          txn.type,
          (txn.amount_cents / 100).toFixed(2),
          acc ? `"${acc.name}"` : "Unknown",
        ];
      });

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `statement_${selectedAccount?.name || "account"}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Helper to get Account Type Icon
  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case "savings":
        return <Landmark className="h-5 w-5" />;
      case "current":
        return <Briefcase className="h-5 w-5" />;
      case "credit_card":
        return <CreditCard className="h-5 w-5" />;
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

  const totalPages = txnData ? Math.ceil(txnData.total / pageSize) : 1;

  return (
    <PageWrapper title="Transactions" onAddTransactionClick={() => setShowAddModal(true)}>
      <AddTransactionModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <EditTransactionModal isOpen={!!editingTxn} onClose={() => setEditingTxn(null)} transaction={editingTxn} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[calc(100vh-12rem)]">
        {/* LEFT PANEL: 1/3 Width Accounts List */}
        <div className={`lg:col-span-1 space-y-4 ${showMobileDetail ? "hidden lg:block" : "block"}`}>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider font-mono px-1">
            Accounts Ledger
          </h3>
          <div className="space-y-3">
            {accountsLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-24 bg-surface border border-border rounded-xl" />
                ))}
              </div>
            ) : accounts.length === 0 ? (
              <div className="bg-surface p-6 rounded-xl border border-border text-center text-sm text-text-secondary">
                No accounts found. Create one in Accounts tab.
              </div>
            ) : (
              accounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;
                return (
                  <button
                    key={acc.id}
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      setShowMobileDetail(true);
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 shadow-md ${
                      isSelected
                        ? "bg-accent/10 border-accent text-text-primary"
                        : "bg-surface border-border text-text-secondary hover:text-text-primary hover:border-text-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? "bg-accent/20 text-accent" : "bg-surface-raised text-text-secondary"}`}>
                        {getAccountIcon(acc.type as AccountType)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">{acc.name}</div>
                        <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mt-0.5">
                          {acc.type === "credit_card" ? "Credit Card" : acc.type}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end items-baseline">
                      <span className="font-mono text-base font-bold">
                        {formatCurrency(acc.balance_cents, "INR")}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: 2/3 Width Selected Account Transactions (Passbook Style) */}
        <div className={`lg:col-span-2 bg-[#0B0F17] border border-border/80 rounded-xl flex flex-col overflow-hidden shadow-2xl ${showMobileDetail ? "block" : "hidden lg:flex"}`}>
          {/* Header Area in Mobile-Statement style */}
          {selectedAccount && (
            <div className="p-6 bg-gradient-to-br from-[#121A2A] via-[#0E131F] to-[#0B0F17] border-b border-border/60 relative">
              <div className="flex items-center justify-between mb-5 h-7">
                {showSearchInHeader ? (
                  <div className="flex items-center gap-2 w-full animate-in fade-in slide-in-from-top-1 duration-155">
                    <Search className="h-4 w-4 text-text-secondary" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none text-white text-sm focus:outline-none w-full placeholder-text-muted"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setShowSearchInHeader(false);
                      }}
                      className="text-[#8888AA] hover:text-white p-1"
                      title="Close Search"
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            setShowMobileDetail(false);
                          } else {
                            window.location.href = "/";
                          }
                        }}
                        className="p-1.5 hover:bg-surface-raised rounded-lg text-text-secondary hover:text-white transition-colors"
                        title="Back"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <h2 className="text-base font-semibold text-white tracking-wide">Statement</h2>
                    </div>
                    <div className="flex items-center gap-1 text-text-secondary">
                      <button
                        onClick={() => setShowSearchInHeader(true)}
                        className="p-1 rounded-lg hover:bg-surface-raised/40 text-text-secondary hover:text-white transition-all"
                        title="Search transactions"
                      >
                        <Search className="h-4.5 w-4.5" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setShowThreeDotsMenu(!showThreeDotsMenu)}
                          className="p-1 rounded-lg hover:bg-surface-raised/40 text-text-secondary hover:text-white transition-all"
                          title="Actions Menu"
                        >
                          <MoreVertical className="h-4.5 w-4.5" />
                        </button>
                        {showThreeDotsMenu && (
                          <>
                            {/* Overlay to close menu on click outside */}
                            <div className="fixed inset-0 z-40" onClick={() => setShowThreeDotsMenu(false)} />
                            <div className="absolute right-0 mt-2 bg-[#121A2A] border border-[#1E293B] rounded-lg shadow-xl py-1.5 w-40 z-50 text-xs text-text-primary animate-in fade-in slide-in-from-top-1 duration-150">
                              <button
                                onClick={() => {
                                  handleExportCSV();
                                  setShowThreeDotsMenu(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-surface-raised transition-colors flex items-center gap-2"
                              >
                                <FileSpreadsheet className="h-3.5 w-3.5 text-text-secondary" />
                                <span>Export CSV</span>
                              </button>
                              <button
                                onClick={() => {
                                  queryClient.invalidateQueries({ queryKey: ["transactions"] });
                                  setShowThreeDotsMenu(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-surface-raised transition-colors flex items-center gap-2"
                              >
                                <RefreshCw className="h-3.5 w-3.5 text-text-secondary" />
                                <span>Refresh Ledger</span>
                              </button>
                              <button
                                onClick={() => {
                                  setShowAddModal(true);
                                  setShowThreeDotsMenu(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-surface-raised transition-colors flex items-center gap-2"
                              >
                                <Plus className="h-3.5 w-3.5 text-text-secondary" />
                                <span>Add Transaction</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs text-[#8888AA] font-medium mb-1">
                    {selectedAccount.type === "credit_card" ? "Credit Card" : selectedAccount.type === "current" ? "Current Account" : "Savings Account"}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-sm text-text-secondary">
                    <span>•••• •••• •••• {selectedAccount.account_number ? selectedAccount.account_number.slice(-4) : "0902"}</span>
                    <EyeOff className="h-3.5 w-3.5 text-[#8888AA] cursor-pointer hover:text-white transition-colors" />
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-[#8888AA] uppercase tracking-wider font-semibold">Available Balance</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    {formatCurrency(selectedAccount.balance_cents, "INR")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Statement Tabs */}
          <div className="flex border-b border-[#1E293B] bg-[#0E131F] select-none">
            <button
              onClick={() => setActiveTab("statement")}
              className={`flex-1 py-3 text-center text-xs font-semibold uppercase tracking-wider transition-all duration-150 border-b-2 ${
                activeTab === "statement"
                  ? "border-accent text-accent"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              Statement
            </button>
            <button
              onClick={() => setActiveTab("get-statement")}
              className={`flex-1 py-3 text-center text-xs font-semibold uppercase tracking-wider transition-all duration-150 border-b-2 ${
                activeTab === "get-statement"
                  ? "border-accent text-accent"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              Get Statement
            </button>
          </div>

          {activeTab === "statement" ? (
            <>
              {/* Filters Bar */}
              <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-[#0B0F17] flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                  {/* Type Select */}
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="bg-surface-raised border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer min-w-[100px]"
                  >
                    <option value="all">Recent</option>
                    <option value="expense">Expenses</option>
                    <option value="income">Income</option>
                  </select>

                  {/* Category Select */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-surface-raised border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer flex-1"
                  >
                    <option value="all">All Categories</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  {/* Date Range Select */}
                  <select
                    value={selectedDateRange}
                    onChange={(e) => setSelectedDateRange(e.target.value)}
                    className="bg-surface-raised border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer min-w-[110px]"
                  >
                    <option value="all">All Time</option>
                    <option value="last-7-days">Last 7 Days</option>
                    <option value="last-30-days">Last 30 Days</option>
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="custom">Custom Range...</option>
                  </select>

                  {/* Export Statement Button */}
                  <button
                    onClick={handleExportCSV}
                    className="p-1.5 bg-surface-raised border border-border rounded-lg text-text-secondary hover:text-white transition-colors"
                    title="Export Statement"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-auto sm:min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-raised border border-border rounded-lg pl-9 pr-4 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Custom Date Inputs */}
              {selectedDateRange === "custom" && (
                <div className="px-4 py-3 border-b border-border bg-[#0E131F]/60 flex items-center gap-3 animate-in slide-in-from-top-1 duration-150 flex-wrap select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary uppercase font-mono">From:</span>
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="bg-surface-raised border border-border rounded-lg px-3 py-1 text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary uppercase font-mono">To:</span>
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="bg-surface-raised border border-border rounded-lg px-3 py-1 text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                    />
                  </div>
                  {(customDateFrom || customDateTo) && (
                    <button
                      onClick={() => {
                        setCustomDateFrom("");
                        setCustomDateTo("");
                      }}
                      className="text-xs text-danger hover:underline font-mono ml-auto"
                    >
                      Clear Dates
                    </button>
                  )}
                </div>
              )}

              {/* Passbook Transactions Ledger */}
              <div className="flex-1 overflow-y-auto min-h-[300px] bg-[#0B0F17]">
                {txnsError && (
                  <div className="p-12 text-center text-danger flex flex-col items-center gap-2">
                    <AlertCircle className="h-8 w-8" />
                    <span className="text-sm font-mono">Failed to load transactions ledger.</span>
                  </div>
                )}

                {txnsLoading ? (
                  <div className="divide-y divide-border p-6 space-y-4 animate-pulse">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="flex justify-between items-center py-3">
                        <div className="w-1/3 space-y-2">
                          <div className="h-4 bg-surface-raised rounded w-3/4" />
                          <div className="h-3 bg-surface-raised rounded w-1/2" />
                        </div>
                        <div className="h-6 bg-surface-raised rounded w-20" />
                      </div>
                    ))}
                  </div>
                ) : filteredTxnItems.length === 0 ? (
                  <div className="p-16 text-center text-text-secondary text-sm flex flex-col items-center justify-center gap-3">
                    <span className="font-mono">No transactions yet</span>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-4 py-2 bg-accent hover:bg-accent/90 text-text-primary rounded-lg text-xs font-semibold transition-all shadow-md shadow-accent/10"
                    >
                      Add Transaction
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {filteredTxnItems.map((txn) => {
                      const runningBal = runningBalances[txn.id];

                      return (
                        <div
                          key={txn.id}
                          className="px-6 py-4 flex flex-col hover:bg-surface-raised/20 transition-colors group relative border-b border-border/20"
                        >
                          {/* Top Row: Date & Amount */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[#8888AA] font-medium font-mono">
                              {formatDate(txn.txn_date)}
                            </span>
                            <div
                              className={`font-semibold text-sm font-mono ${
                                txn.type === "income" ? "text-success" : "text-white"
                              }`}
                            >
                              {txn.type === "income" ? "+ " : "- "}
                              {formatCurrency(Math.abs(txn.amount_cents), "INR")}
                            </div>
                          </div>

                          {/* Middle Row: Description */}
                          <div className="mt-1 flex items-start justify-between">
                            <span className="font-semibold text-sm text-white break-words max-w-[85%]">
                              {txn.description || "Unlabeled Transaction"}
                            </span>
                            
                            {/* Actions on hover */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-155 shrink-0 absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                              <button
                                onClick={() => setEditingTxn(txn)}
                                className="p-1.5 rounded text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                                title="Edit transaction"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(txn)}
                                className="p-1.5 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                                title="Delete transaction"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Bottom Row: Category badge & Ref No on left, Balance on right */}
                          <div className="flex items-center justify-between mt-2.5">
                            <div className="flex items-center gap-2 text-xs text-[#8888AA] font-mono flex-wrap">
                              <span className="bg-accent/10 border border-accent/25 text-accent text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider select-none">
                                {txn.category}
                              </span>
                              <span>•</span>
                              <span>Ref No: {txn.id.replace(/[^0-9]/g, "").slice(0, 12) || txn.id.slice(0, 12)}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(txn.id);
                                }}
                                className="hover:text-white transition-colors p-0.5"
                                title="Copy Transaction ID"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>

                            {runningBal !== undefined && (
                              <div className="text-xs text-[#8888AA] font-mono">
                                Balance: {formatCurrency(runningBal, "INR")}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-surface-raised/5 font-mono text-xs text-text-secondary select-none">
                  <div>
                    Page <span className="text-text-primary">{page}</span> of{" "}
                    <span className="text-text-primary">{totalPages}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded border border-border hover:border-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded border border-border hover:border-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 p-8 space-y-6 bg-[#0B0F17] overflow-y-auto">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">Download Account Statement</h3>
                <p className="text-xs text-[#8888AA]">
                  Specify a date range and format to export your statement.
                </p>
              </div>

              <div className="bg-[#0E1320] border border-border/60 rounded-xl p-6 space-y-5 max-w-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#8888AA] uppercase tracking-wider font-mono">
                      Date From
                    </label>
                    <input
                      type="date"
                      value={statementDateFrom}
                      onChange={(e) => setStatementDateFrom(e.target.value)}
                      className="w-full bg-[#07090E] border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#8888AA] uppercase tracking-wider font-mono">
                      Date To
                    </label>
                    <input
                      type="date"
                      value={statementDateTo}
                      onChange={(e) => setStatementDateTo(e.target.value)}
                      className="w-full bg-[#07090E] border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#8888AA] uppercase tracking-wider font-mono">
                    File Format
                  </label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-full bg-[#07090E] border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                  >
                    <option value="csv">CSV Spreadsheet (.csv)</option>
                    <option value="json">JSON Data Feed (.json)</option>
                  </select>
                </div>

                <button
                  onClick={handleDownloadCustomStatement}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 text-text-primary rounded-lg text-sm font-semibold transition-all shadow-lg shadow-accent/20"
                >
                  <FileSpreadsheet className="h-4.5 w-4.5" />
                  <span>Download Statement</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Delete Dialog */}
      {deletingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeletingTxn(null)} />
          <div className="relative bg-surface border border-border rounded-xl p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <h4 className="text-base font-semibold text-text-primary">Delete Transaction</h4>
            <p className="text-sm text-text-secondary">
              Are you sure you want to delete this transaction for{" "}
              <span className="text-text-primary font-semibold font-mono">
                {formatCurrency(deletingTxn.amount_cents, "INR")}
              </span>
              ? This will adjust your account balance.
            </p>
            {deleteError && (
              <div className="bg-danger/10 border border-danger/25 text-danger px-3 py-2 rounded text-xs">
                {deleteError}
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingTxn(null)}
                className="px-4 py-2 border border-border hover:bg-surface-raised rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
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
