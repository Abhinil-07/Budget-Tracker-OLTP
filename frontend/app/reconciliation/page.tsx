"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { useFinanceStore } from "../../stores/useFinanceStore";
import { useAccounts } from "../../hooks/useAccounts";
import { useTransactions } from "../../hooks/useTransactions";
import PageWrapper from "../../components/layout/PageWrapper";
import AddTransactionModal from "../../components/transactions/AddTransactionModal";
import { formatCurrency } from "../../lib/formatCurrency";
import { formatDate } from "../../lib/formatDate";
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  CreditCard,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Edit2,
  Check,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Receipt,
  ShieldCheck,
} from "lucide-react";

export default function ReconciliationPage() {
  const { token, hydrated, hydrate } = useAuthStore();
  const { startingBalances, setStartingBalance, hydrateFinance } = useFinanceStore();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
  const [selectedCcAccountId, setSelectedCcAccountId] = useState<string>("");
  
  // Custom verification inputs
  const [actualBankInput, setActualBankInput] = useState<string>("");
  const [actualCcInput, setActualCcInput] = useState<string>("");
  
  // Inline editing for starting balance
  const [isEditingStartingBalance, setIsEditingStartingBalance] = useState(false);
  const [startingBalanceInput, setStartingBalanceInput] = useState<string>("");
  
  // Active timeframe filter
  const [timeframe, setTimeframe] = useState<"current-month" | "all-time">("current-month");

  useEffect(() => {
    hydrate();
    hydrateFinance();
  }, [hydrate, hydrateFinance]);

  useEffect(() => {
    if (hydrated && !token) {
      window.location.href = "/login";
    }
  }, [hydrated, token]);

  // Fetch accounts
  const { data: accounts = [] } = useAccounts();

  // Separate accounts by type
  const bankAccounts = useMemo(() => {
    return accounts.filter((a) => a.type === "savings" || a.type === "current");
  }, [accounts]);

  const creditCardAccounts = useMemo(() => {
    return accounts.filter((a) => a.type === "credit_card");
  }, [accounts]);

  // Set default selections
  useEffect(() => {
    if (bankAccounts.length > 0 && !selectedBankAccountId) {
      const sliceBank = bankAccounts.find((a) => a.name.toLowerCase().includes("slice")) || bankAccounts[0];
      setSelectedBankAccountId(sliceBank.id);
    }
  }, [bankAccounts, selectedBankAccountId]);

  useEffect(() => {
    if (creditCardAccounts.length > 0 && !selectedCcAccountId) {
      const sliceCc = creditCardAccounts.find((a) => a.name.toLowerCase().includes("slice")) || creditCardAccounts[0];
      setSelectedCcAccountId(sliceCc.id);
    }
  }, [creditCardAccounts, selectedCcAccountId]);

  // Current selected accounts
  const selectedBankAccount = useMemo(() => {
    return bankAccounts.find((a) => a.id === selectedBankAccountId);
  }, [bankAccounts, selectedBankAccountId]);

  const selectedCcAccount = useMemo(() => {
    return creditCardAccounts.find((a) => a.id === selectedCcAccountId);
  }, [creditCardAccounts, selectedCcAccountId]);

  // Date boundaries based on timeframe
  const dateParams = useMemo(() => {
    if (timeframe === "all-time") return { date_from: undefined, date_to: undefined };
    const today = new Date();
    const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    return { date_from: startOfMonth, date_to: undefined };
  }, [timeframe]);

  // Fetch all transactions
  const { data: txnsResponse } = useTransactions({
    page: 1,
    page_size: 10000,
    ...dateParams,
  });

  const allTxns = useMemo(() => {
    return txnsResponse?.items || [];
  }, [txnsResponse]);

  // 1. Bank Account Calculations
  const bankTxns = useMemo(() => {
    if (!selectedBankAccountId) return [];
    return allTxns.filter((t) => t.account_id === selectedBankAccountId);
  }, [allTxns, selectedBankAccountId]);

  const bankSpends = useMemo(() => {
    return bankTxns
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount_cents, 0);
  }, [bankTxns]);

  const bankOwedIncomes = useMemo(() => {
    return bankTxns
      .filter((t) => t.type === "income" && t.category.toLowerCase().includes("owed"))
      .reduce((sum, t) => sum + t.amount_cents, 0);
  }, [bankTxns]);

  const bankOtherIncomes = useMemo(() => {
    return bankTxns
      .filter((t) => t.type === "income" && !t.category.toLowerCase().includes("owed"))
      .reduce((sum, t) => sum + t.amount_cents, 0);
  }, [bankTxns]);

  // Starting balance in cents for selected bank account (defaults to 2307000 if Slice Bank and not set)
  const currentStartingBalanceCents = useMemo(() => {
    if (!selectedBankAccountId) return 0;
    if (startingBalances[selectedBankAccountId] !== undefined) {
      return startingBalances[selectedBankAccountId];
    }
    // Default baseline for initial setup if Slice Bank
    if (selectedBankAccount?.name.toLowerCase().includes("slice")) {
      return 2307000; // ₹23,070.00
    }
    return selectedBankAccount?.balance_cents || 0;
  }, [selectedBankAccountId, startingBalances, selectedBankAccount]);

  // Expected calculated bank balance
  const expectedBankBalanceCents = useMemo(() => {
    return currentStartingBalanceCents + bankOwedIncomes + bankOtherIncomes - bankSpends;
  }, [currentStartingBalanceCents, bankOwedIncomes, bankOtherIncomes, bankSpends]);

  // Real money that actually belongs to the user
  const realMoneyInBankCents = useMemo(() => {
    const liveOrExpected = selectedBankAccount ? selectedBankAccount.balance_cents : expectedBankBalanceCents;
    return Math.max(0, liveOrExpected - bankOwedIncomes);
  }, [selectedBankAccount, expectedBankBalanceCents, bankOwedIncomes]);

  // Bank Match evaluation
  const parsedActualBankCents = useMemo(() => {
    if (!actualBankInput.trim()) return null;
    const cleanNum = parseFloat(actualBankInput.replace(/[^0-9.]/g, ""));
    return isNaN(cleanNum) ? null : Math.round(cleanNum * 100);
  }, [actualBankInput]);

  const bankDifferenceCents = useMemo(() => {
    if (parsedActualBankCents === null) {
      if (!selectedBankAccount) return 0;
      return selectedBankAccount.balance_cents - expectedBankBalanceCents;
    }
    return parsedActualBankCents - expectedBankBalanceCents;
  }, [parsedActualBankCents, selectedBankAccount, expectedBankBalanceCents]);

  // 2. Credit Card Bill Calculations
  const ccTxns = useMemo(() => {
    if (!selectedCcAccountId) return [];
    return allTxns.filter((t) => t.account_id === selectedCcAccountId);
  }, [allTxns, selectedCcAccountId]);

  const totalCcSpendsCents = useMemo(() => {
    return ccTxns
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount_cents, 0);
  }, [ccTxns]);

  // All "Owed to Me" receipts across accounts (or bank)
  const allOwedToMeTxns = useMemo(() => {
    return allTxns.filter((t) => t.category.toLowerCase().includes("owed"));
  }, [allTxns]);

  const totalOwedToMeCents = useMemo(() => {
    return allOwedToMeTxns.reduce((sum, t) => sum + t.amount_cents, 0);
  }, [allOwedToMeTxns]);

  // CC Match evaluation
  const parsedActualCcCents = useMemo(() => {
    if (!actualCcInput.trim()) return null;
    const cleanNum = parseFloat(actualCcInput.replace(/[^0-9.]/g, ""));
    return isNaN(cleanNum) ? null : Math.round(cleanNum * 100);
  }, [actualCcInput]);

  const ccDifferenceCents = useMemo(() => {
    if (parsedActualCcCents === null) return null;
    return parsedActualCcCents - (totalCcSpendsCents + totalOwedToMeCents);
  }, [parsedActualCcCents, totalCcSpendsCents, totalOwedToMeCents]);

  // Save Starting Balance
  const handleSaveStartingBalance = () => {
    if (!selectedBankAccountId) return;
    const parsed = parseFloat(startingBalanceInput);
    if (!isNaN(parsed) && parsed >= 0) {
      setStartingBalance(selectedBankAccountId, Math.round(parsed * 100));
    }
    setIsEditingStartingBalance(false);
  };

  return (
    <PageWrapper>
      <div className="space-y-8 pb-16 max-w-7xl mx-auto">
        {/* Header Area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Scale className="h-6 w-6 text-accent" />
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Daily Reconciliation
              </h1>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Verify your live bank balances, split friend liabilities, and match your credit card bills.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Timeframe Selector */}
            <div className="flex bg-[#0E131F] border border-border p-1 rounded-lg">
              <button
                onClick={() => setTimeframe("current-month")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  timeframe === "current-month"
                    ? "bg-accent/20 text-accent border border-accent/40"
                    : "text-text-secondary hover:text-white"
                }`}
              >
                Current Month
              </button>
              <button
                onClick={() => setTimeframe("all-time")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  timeframe === "all-time"
                    ? "bg-accent/20 text-accent border border-accent/40"
                    : "text-text-secondary hover:text-white"
                }`}
              >
                All Time
              </button>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-accent hover:bg-accent/90 text-black font-semibold text-xs rounded-lg transition-all shadow-md shadow-accent/20"
            >
              <Plus className="h-4 w-4" />
              <span>Log Entry</span>
            </button>
          </div>
        </div>

        {/* TOP SUMMARY STATS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat 1: Real Money in Bank */}
          <div className="bg-[#0E1320] border border-success/30 rounded-xl p-5 relative overflow-hidden shadow-lg">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-mono uppercase text-[#8888AA] tracking-wider">
                Your Real Money (Bank)
              </span>
              <div className="p-2 rounded-lg bg-success/10 text-success border border-success/20">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-success mt-2 tracking-tight">
              {formatCurrency(realMoneyInBankCents, "INR")}
            </div>
            <p className="text-[11px] text-[#8888AA] mt-1.5">
              100% your money (free of friend liabilities)
            </p>
          </div>

          {/* Stat 2: Friend Money in Bank */}
          <div className="bg-[#0E1320] border border-accent/30 rounded-xl p-5 relative overflow-hidden shadow-lg">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-mono uppercase text-[#8888AA] tracking-wider">
                Friend Money (Parked)
              </span>
              <div className="p-2 rounded-lg bg-accent/10 text-accent border border-accent/20">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-accent mt-2 tracking-tight">
              {formatCurrency(bankOwedIncomes, "INR")}
            </div>
            <p className="text-[11px] text-[#8888AA] mt-1.5">
              Sitting in bank to pay credit card bill
            </p>
          </div>

          {/* Stat 3: Total Bank Balance */}
          <div className="bg-[#0E1320] border border-border/80 rounded-xl p-5 relative overflow-hidden shadow-lg">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-mono uppercase text-[#8888AA] tracking-wider">
                Current Bank Balance
              </span>
              <div className="p-2 rounded-lg bg-surface-raised text-text-secondary border border-border">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-2 tracking-tight">
              {formatCurrency(selectedBankAccount?.balance_cents || expectedBankBalanceCents, "INR")}
            </div>
            <p className="text-[11px] text-[#8888AA] mt-1.5">
              {selectedBankAccount?.name || "Selected Bank"} ledger total
            </p>
          </div>

          {/* Stat 4: Credit Card Liability */}
          <div className="bg-[#0E1320] border border-warning/30 rounded-xl p-5 relative overflow-hidden shadow-lg">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-mono uppercase text-[#8888AA] tracking-wider">
                Credit Card Spends
              </span>
              <div className="p-2 rounded-lg bg-warning/10 text-warning border border-warning/20">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-warning mt-2 tracking-tight">
              {formatCurrency(totalCcSpendsCents, "INR")}
            </div>
            <p className="text-[11px] text-[#8888AA] mt-1.5">
              {selectedCcAccount?.name || "Credit Card"} total card swipes
            </p>
          </div>
        </div>

        {/* MAIN TWO-COLUMN RECONCILIATION SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* SECTION 1: BANK ACCOUNT RECONCILER */}
          <div className="bg-[#0B0F17] border border-border/80 rounded-xl p-6 space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-5">
              {/* Card Header & Account Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <Wallet className="h-5 w-5 text-accent" />
                  <div>
                    <h3 className="text-base font-bold text-white">Bank Balance Reconciler</h3>
                    <p className="text-[11px] text-[#8888AA]">Reconcile starting balance, friend deposits & spends</p>
                  </div>
                </div>

                <select
                  value={selectedBankAccountId}
                  onChange={(e) => setSelectedBankAccountId(e.target.value)}
                  className="bg-[#07090E] border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                >
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Starting Balance Config Box */}
              <div className="bg-[#0E1320] border border-border/70 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#8888AA] uppercase font-mono tracking-wider">
                    1. Fixed Starting Balance
                  </span>
                  {!isEditingStartingBalance ? (
                    <button
                      onClick={() => {
                        setStartingBalanceInput((currentStartingBalanceCents / 100).toString());
                        setIsEditingStartingBalance(true);
                      }}
                      className="flex items-center gap-1.5 text-xs text-accent hover:underline font-medium"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit Baseline</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveStartingBalance}
                        className="flex items-center gap-1 px-2.5 py-1 bg-success/20 text-success border border-success/40 rounded-md text-xs font-semibold hover:bg-success/30"
                      >
                        <Check className="h-3 w-3" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => setIsEditingStartingBalance(false)}
                        className="px-2 py-1 bg-surface-raised border border-border text-text-muted hover:text-white rounded-md text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {isEditingStartingBalance ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-text-muted">₹</span>
                    <input
                      type="number"
                      step="any"
                      value={startingBalanceInput}
                      onChange={(e) => setStartingBalanceInput(e.target.value)}
                      placeholder="e.g. 23070"
                      className="w-full bg-[#07090E] border border-accent rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-mono text-white">
                      {formatCurrency(currentStartingBalanceCents, "INR")}
                    </span>
                    <span className="text-[11px] text-[#8888AA]">Initial opening balance</span>
                  </div>
                )}
              </div>

              {/* Step-by-Step Ledger Math Card */}
              <div className="bg-[#0E1320] border border-border/70 rounded-xl p-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center text-text-muted pb-2 border-b border-border/40">
                  <span>Starting Balance:</span>
                  <span className="text-white font-semibold">{formatCurrency(currentStartingBalanceCents, "INR")}</span>
                </div>
                <div className="flex justify-between items-center text-success pb-2 border-b border-border/40">
                  <span className="flex items-center gap-1.5">
                    <ArrowUpRight className="h-3.5 w-3.5" /> + Friend Money Received (Owed):
                  </span>
                  <span className="font-semibold">+{formatCurrency(bankOwedIncomes, "INR")}</span>
                </div>
                {bankOtherIncomes > 0 && (
                  <div className="flex justify-between items-center text-accent pb-2 border-b border-border/40">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> + Cashbacks & Other Income:
                    </span>
                    <span className="font-semibold">+{formatCurrency(bankOtherIncomes, "INR")}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-danger pb-2 border-b border-border/40">
                  <span className="flex items-center gap-1.5">
                    <ArrowDownRight className="h-3.5 w-3.5" /> − Direct Bank Spends:
                  </span>
                  <span className="font-semibold">−{formatCurrency(bankSpends, "INR")}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1 text-white font-bold bg-[#07090E]/60 p-2.5 rounded-lg border border-accent/20">
                  <span className="text-accent">= Expected Bank Balance:</span>
                  <span className="text-accent">{formatCurrency(expectedBankBalanceCents, "INR")}</span>
                </div>
              </div>

              {/* Interactive Bank Match Verifier */}
              <div className="bg-surface-raised/30 border border-border/80 rounded-xl p-4 space-y-3">
                <label className="block text-[11px] font-semibold text-[#8888AA] uppercase font-mono tracking-wider">
                  Live Verification: Enter Actual Bank App Balance
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-xs font-mono text-text-muted">₹</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 23855"
                      value={actualBankInput}
                      onChange={(e) => setActualBankInput(e.target.value)}
                      className="w-full bg-[#07090E] border border-border focus:border-accent rounded-lg pl-7 pr-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                  {actualBankInput && (
                    <button
                      onClick={() => setActualBankInput("")}
                      className="p-1.5 text-text-muted hover:text-white rounded-lg hover:bg-surface-raised"
                      title="Clear"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Match Evaluation Badge */}
                <div className="pt-2">
                  {bankDifferenceCents === 0 ? (
                    <div className="flex items-center gap-2 p-2.5 bg-success/15 border border-success/40 text-success rounded-lg text-xs font-semibold">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>100% Perfect Match! (₹0.00 difference)</span>
                    </div>
                  ) : bankDifferenceCents > 0 ? (
                    <div className="flex items-center justify-between p-2.5 bg-accent/15 border border-accent/40 text-accent rounded-lg text-xs font-semibold font-mono">
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 shrink-0" />
                        Surplus in Bank:
                      </span>
                      <span>+{formatCurrency(bankDifferenceCents, "INR")}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2.5 bg-warning/15 border border-warning/40 text-warning rounded-lg text-xs font-semibold font-mono">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        Discrepancy / Gap:
                      </span>
                      <span>{formatCurrency(bankDifferenceCents, "INR")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Split Summary Footer */}
            <div className="pt-4 border-t border-border/60 text-xs flex justify-between items-center text-[#8888AA]">
              <span>Real Money: <strong className="text-white font-mono">{formatCurrency(realMoneyInBankCents, "INR")}</strong></span>
              <span>Friend Liability: <strong className="text-accent font-mono">{formatCurrency(bankOwedIncomes, "INR")}</strong></span>
            </div>
          </div>

          {/* SECTION 2: CREDIT CARD BILL RECONCILER */}
          <div className="bg-[#0B0F17] border border-border/80 rounded-xl p-6 space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-5">
              {/* Card Header & CC Account Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="h-5 w-5 text-warning" />
                  <div>
                    <h3 className="text-base font-bold text-white">Credit Card Bill Reconciler</h3>
                    <p className="text-[11px] text-[#8888AA]">Match card swipes + friend owed liabilities</p>
                  </div>
                </div>

                <select
                  value={selectedCcAccountId}
                  onChange={(e) => setSelectedCcAccountId(e.target.value)}
                  className="bg-[#07090E] border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                >
                  {creditCardAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* The CC Formula Box */}
              <div className="p-3.5 rounded-xl bg-[#0E1320] border border-border/60 text-xs text-text-secondary space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Sparkles className="h-4 w-4 text-warning" />
                  <span>The Credit Card Bill Formula</span>
                </div>
                <p className="text-[11px] text-[#8888AA] leading-relaxed">
                  Your Credit Card Bill equals <strong className="text-white">Your Personal Spends</strong> + <strong className="text-accent">Friend Spends (Owed to You)</strong> that you paid for using your card.
                </p>
              </div>

              {/* Step-by-Step CC Breakdown */}
              <div className="bg-[#0E1320] border border-border/70 rounded-xl p-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center text-text-muted pb-2 border-b border-border/40">
                  <span>Your Personal Card Spends:</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(totalCcSpendsCents, "INR")}
                  </span>
                </div>
                <div className="flex justify-between items-center text-accent pb-2 border-b border-border/40">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> + Friend Spends (Owed to You):
                  </span>
                  <span className="font-semibold">+{formatCurrency(totalOwedToMeCents, "INR")}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1 text-white font-bold bg-[#07090E]/60 p-2.5 rounded-lg border border-warning/20">
                  <span className="text-warning">= Total Reconciled Bill:</span>
                  <span className="text-warning">
                    {formatCurrency(totalCcSpendsCents + totalOwedToMeCents, "INR")}
                  </span>
                </div>
              </div>

              {/* Interactive CC Match Verifier */}
              <div className="bg-surface-raised/30 border border-border/80 rounded-xl p-4 space-y-3">
                <label className="block text-[11px] font-semibold text-[#8888AA] uppercase font-mono tracking-wider">
                  Live Verification: Enter Bill from Credit Card App
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-xs font-mono text-text-muted">₹</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 3015"
                      value={actualCcInput}
                      onChange={(e) => setActualCcInput(e.target.value)}
                      className="w-full bg-[#07090E] border border-border focus:border-accent rounded-lg pl-7 pr-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                  {actualCcInput && (
                    <button
                      onClick={() => setActualCcInput("")}
                      className="p-1.5 text-text-muted hover:text-white rounded-lg hover:bg-surface-raised"
                      title="Clear"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* CC Match Evaluation Badge */}
                {parsedActualCcCents !== null && (
                  <div className="pt-2">
                    {ccDifferenceCents === 0 ? (
                      <div className="flex items-center gap-2 p-2.5 bg-success/15 border border-success/40 text-success rounded-lg text-xs font-semibold">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>100% Perfect Match with Card Statement!</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2.5 bg-warning/15 border border-warning/40 text-warning rounded-lg text-xs font-semibold font-mono">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          Difference / Minor Fee:
                        </span>
                        <span>{formatCurrency(Math.abs(ccDifferenceCents || 0), "INR")}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* CC Summary Footer */}
            <div className="pt-4 border-t border-border/60 text-xs flex justify-between items-center text-[#8888AA]">
              <span>Card Swipes: <strong className="text-white font-mono">{ccTxns.length} txns</strong></span>
              <span>Total Bill: <strong className="text-warning font-mono">{formatCurrency(totalCcSpendsCents + totalOwedToMeCents, "INR")}</strong></span>
            </div>
          </div>
        </div>

        {/* SECTION 3: ALL "OWED TO ME" RECEIPTS HUB */}
        <div className="bg-[#0B0F17] border border-border/80 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0E131F]/60">
            <div className="flex items-center gap-2.5">
              <Receipt className="h-5 w-5 text-accent" />
              <div>
                <h3 className="text-base font-bold text-white">"Owed to Me" Receipts Ledger</h3>
                <p className="text-[11px] text-[#8888AA]">
                  All reimbursements received in bank that are set aside to pay the credit card bill.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent font-mono text-xs font-bold">
                {allOwedToMeTxns.length} Receipts
              </span>
              <span className="text-sm font-bold font-mono text-white">
                Total: {formatCurrency(totalOwedToMeCents, "INR")}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-[#07090E] text-[10px] uppercase tracking-wider text-[#8888AA] font-mono">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Account Credited</th>
                  <th className="py-3 px-4 text-right">Amount Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {allOwedToMeTxns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-text-muted font-sans">
                      No "Owed to Me" receipts found for this timeframe.
                    </td>
                  </tr>
                ) : (
                  allOwedToMeTxns.map((txn) => {
                    const acc = accounts.find((a) => a.id === txn.account_id);
                    return (
                      <tr key={txn.id} className="hover:bg-surface-raised/30 transition-colors">
                        <td className="py-3 px-4 text-text-secondary">
                          {formatDate(txn.txn_date)}
                        </td>
                        <td className="py-3 px-4 font-sans font-medium text-white">
                          {txn.description || txn.category}
                        </td>
                        <td className="py-3 px-4 text-text-muted">
                          {acc?.name || "Bank Account"}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-accent">
                          +{formatCurrency(txn.amount_cents, "INR")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <AddTransactionModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </PageWrapper>
  );
}
