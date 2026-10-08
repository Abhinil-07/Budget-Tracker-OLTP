"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft,
  Check, 
  X,
  Search,
  Plus,
  Delete,
  Wallet as WalletIcon,
  Tag,
  Wifi,
  Battery,
  Users,
  Calendar as CalendarIcon,
  MessageSquare,
  Calculator as CalcIcon,
  UtensilsCrossed,
  Car,
  ShoppingCart,
  ShoppingBag,
  Film,
  HeartPulse,
  Zap,
  Home,
  Briefcase,
  Laptop,
  TrendingUp,
  ArrowRightLeft,
  HandCoins
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAccounts } from "../../hooks/useAccounts";
import { useCategories } from "../../hooks/useCategories";
import { formatCurrency } from "../../lib/formatCurrency";

interface CalculatorTransactionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: "expense" | "income";
}

// Category icon helper
const getCategoryIcon = (category: string) => {
  const lower = category.toLowerCase();
  if (lower.includes("food") || lower.includes("dining") || lower.includes("restaurant") || lower.includes("cafe")) {
    return <UtensilsCrossed className="h-4 w-4 text-amber-400" />;
  }
  if (lower.includes("transport") || lower.includes("cab") || lower.includes("fuel") || lower.includes("uber")) {
    return <Car className="h-4 w-4 text-blue-400" />;
  }
  if (lower.includes("grocer") || lower.includes("mart") || lower.includes("supermarket")) {
    return <ShoppingCart className="h-4 w-4 text-emerald-400" />;
  }
  if (lower.includes("shop") || lower.includes("clothing") || lower.includes("amazon")) {
    return <ShoppingBag className="h-4 w-4 text-pink-400" />;
  }
  if (lower.includes("entertain") || lower.includes("movie") || lower.includes("ott") || lower.includes("music")) {
    return <Film className="h-4 w-4 text-purple-400" />;
  }
  if (lower.includes("health") || lower.includes("med") || lower.includes("doctor")) {
    return <HeartPulse className="h-4 w-4 text-rose-400" />;
  }
  if (lower.includes("util") || lower.includes("bill") || lower.includes("electric") || lower.includes("wifi")) {
    return <Zap className="h-4 w-4 text-yellow-400" />;
  }
  if (lower.includes("rent") || lower.includes("house") || lower.includes("pg")) {
    return <Home className="h-4 w-4 text-orange-400" />;
  }
  if (lower.includes("salary") || lower.includes("wage") || lower.includes("paycheck")) {
    return <Briefcase className="h-4 w-4 text-emerald-400" />;
  }
  if (lower.includes("freelance") || lower.includes("consult") || lower.includes("gig")) {
    return <Laptop className="h-4 w-4 text-teal-400" />;
  }
  if (lower.includes("invest") || lower.includes("stock") || lower.includes("mutual") || lower.includes("dividend")) {
    return <TrendingUp className="h-4 w-4 text-indigo-400" />;
  }
  if (lower.includes("transfer")) {
    return <ArrowRightLeft className="h-4 w-4 text-cyan-400" />;
  }
  if (lower.includes("owe") || lower.includes("debt") || lower.includes("split")) {
    return <HandCoins className="h-4 w-4 text-purple-400" />;
  }
  return <Tag className="h-4 w-4 text-neutral-400" />;
};

export default function CalculatorTransactionDrawer({
  isOpen,
  onClose,
  defaultType = "expense",
}: CalculatorTransactionDrawerProps) {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useAccounts();
  const { categories, addCategory } = useCategories();

  // Core transaction state (Default amount 0, NOT 100)
  const [txnType, setTxnType] = useState<"expense" | "income">(defaultType);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [amountStr, setAmountStr] = useState<string>("0");
  const [mathExpression, setMathExpression] = useState<string>("");
  const [showCalculatorOperators, setShowCalculatorOperators] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [txnDate, setTxnDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

  // Modals & Pickers
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");

  // Bill splitting state
  const [isSplitEnabled, setIsSplitEnabled] = useState(false);
  const [splitCount, setSplitCount] = useState(2);

  // Animation Stages: "idle" | "topping_up" | "topped_up"
  const [animStage, setAnimStage] = useState<"idle" | "topping_up" | "topped_up">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Set default account when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // Sync defaultType
  useEffect(() => {
    setTxnType(defaultType);
  }, [defaultType]);

  // Set default category based on type
  useEffect(() => {
    if (txnType === "income") {
      if (categories.includes("Salary")) setSelectedCategory("Salary");
      else if (categories.includes("Freelance")) setSelectedCategory("Freelance");
      else if (categories.length > 0) setSelectedCategory(categories[0]);
    } else {
      if (categories.includes("Food & Dining")) setSelectedCategory("Food & Dining");
      else if (categories.length > 0) setSelectedCategory(categories[0]);
    }
  }, [txnType, categories]);

  const activeAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  }, [accounts, selectedAccountId]);

  // Currency symbol helper
  const currencySymbol = useMemo(() => {
    const c = activeAccount?.currency || "INR";
    if (c === "INR") return "₹";
    if (c === "USD") return "$";
    if (c === "EUR") return "€";
    if (c === "GBP") return "£";
    return c;
  }, [activeAccount?.currency]);

  // Date display label
  const dateDisplayLabel = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (txnDate === todayStr) return "Today";
    if (txnDate === yesterdayStr) return "Yesterday";

    try {
      const parts = txnDate.split("-");
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return txnDate;
    }
  }, [txnDate]);

  // Evaluated numerical amount (accounting for mathExpression)
  const parsedAmount = useMemo(() => {
    try {
      if (mathExpression) {
        const fullExpr = (mathExpression + (amountStr === "0" ? "" : amountStr))
          .replace(/×/g, "*")
          .replace(/÷/g, "/")
          .replace(/[^0-9+\-*/.]/g, "");
        if (!fullExpr) return 0;
        // eslint-disable-next-line no-eval
        const result = Function(`'use strict'; return (${fullExpr})`)();
        if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
          return Math.max(0, result);
        }
      }
      const val = parseFloat(amountStr);
      return isNaN(val) ? 0 : Math.max(0, val);
    } catch {
      return parseFloat(amountStr) || 0;
    }
  }, [amountStr, mathExpression]);

  // Keypad Handlers
  const handleDigit = (digit: string) => {
    if (amountStr === "0" && digit !== ".") {
      setAmountStr(digit);
    } else if (digit === ".") {
      if (!amountStr.includes(".")) {
        setAmountStr(amountStr + ".");
      }
    } else {
      const parts = amountStr.split(".");
      if (parts.length > 1 && parts[1].length >= 2) return;
      if (amountStr.length < 9) {
        setAmountStr(amountStr + digit);
      }
    }
  };

  const handleBackspace = () => {
    if (amountStr.length <= 1) {
      if (mathExpression) {
        setMathExpression("");
      }
      setAmountStr("0");
    } else {
      setAmountStr(amountStr.slice(0, -1));
    }
  };

  const handleOperator = (op: "+" | "-" | "×" | "÷") => {
    try {
      const current = parseFloat(amountStr) || 0;
      setMathExpression(`${current} ${op} `);
      setAmountStr("0");
    } catch {
      // ignore
    }
  };

  const handleAddCustomCategory = () => {
    const trimmed = categorySearchQuery.trim();
    if (!trimmed) return;
    addCategory(trimmed);
    setSelectedCategory(trimmed);
    setCategorySearchQuery("");
    setIsCategoryPickerOpen(false);
  };

  // Close reset handler
  const handleClose = () => {
    setAnimStage("idle");
    setAmountStr("0");
    setMathExpression("");
    setShowCalculatorOperators(false);
    setDescription("");
    setShowNoteInput(false);
    setIsSplitEnabled(false);
    setIsAccountPickerOpen(false);
    setIsCategoryPickerOpen(false);
    setErrorMessage(null);
    onClose();
  };

  // Continue action: runs API and triggers the exact video animation
  const handleContinue = async () => {
    if (parsedAmount <= 0) {
      setErrorMessage("Please enter an amount greater than 0");
      return;
    }
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }

    setErrorMessage(null);

    // 1. Enter "topping_up" stage (Spins with bottom glowing aurora)
    setAnimStage("topping_up");

    const amountCents = Math.round(parsedAmount * 100);
    const targetAccId = selectedAccountId || (accounts[0] ? accounts[0].id : "");

    try {
      // Execute the API call concurrently with the animation
      const apiPromise = api.transactions.create({
        amount_cents: amountCents,
        type: txnType,
        account_id: targetAccId,
        category: selectedCategory || (txnType === "expense" ? "Food & Dining" : "Salary"),
        description: description.trim() || (txnType === "expense" ? "Expense entry" : "Wallet top up"),
        txn_date: txnDate,
        is_included: true,
      });

      // Split bill handling
      if (isSplitEnabled && txnType === "expense" && splitCount > 1) {
        const roommateShareCents = Math.round(amountCents * ((splitCount - 1) / splitCount));
        if (roommateShareCents > 0) {
          await api.transactions.create({
            amount_cents: roommateShareCents,
            type: "expense",
            account_id: targetAccId,
            category: "Owed to Me",
            description: `Split share: ${description.trim() || "Shared Bill"}`,
            txn_date: txnDate,
            is_included: false,
          });
        }
      }

      // Minimum duration for "Topping up wallet" stage to match video rhythm (~1.6s)
      const delayPromise = new Promise((resolve) => setTimeout(resolve, 1600));

      const [res] = await Promise.all([apiPromise, delayPromise]);

      if (res.error) {
        throw new Error(res.error.message);
      }

      // Invalidate queries so dashboard & transactions immediately reflect updated balances
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["budget"] });

      // 2. Transition to "topped_up" stage (Aurora shoots UPWARD, icon becomes checkmark)
      setAnimStage("topped_up");

      // 3. Keep "Wallet topped up" screen briefly (~1.8s) before closing
      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record transaction";
      setErrorMessage(msg);
      setAnimStage("idle");
    }
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return categories;
    return categories.filter((c) =>
      c.toLowerCase().includes(categorySearchQuery.trim().toLowerCase())
    );
  }, [categories, categorySearchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl select-none overflow-hidden">
      {/* 
        Main Canvas Container:
        - On desktop: Sleek, borderless, floating card with soft deep shadow (NO fake phone borders/notch)
        - On mobile: Full-screen native experience
      */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full h-full sm:h-auto sm:max-w-[420px] sm:max-h-[850px] sm:rounded-3xl bg-[#09090D] text-white sm:shadow-[0_20px_70px_rgba(0,0,0,0.9)] relative flex flex-col justify-between overflow-hidden"
      >
        {/* Mobile-only status bar */}
        <div className="block sm:hidden pt-3 px-6 z-20">
          <div className="flex items-center justify-between text-xs font-semibold text-white/90 pt-1 pb-2">
            <span>9:41</span>
            <div className="flex items-center gap-1.5 opacity-90">
              <div className="flex items-end gap-[1.5px] h-2.5">
                <div className="w-[2.5px] h-1 bg-white rounded-xs" />
                <div className="w-[2.5px] h-1.5 bg-white rounded-xs" />
                <div className="w-[2.5px] h-2 bg-white rounded-xs" />
                <div className="w-[2.5px] h-2.5 bg-white rounded-xs" />
              </div>
              <Wifi className="w-3.5 h-3.5 stroke-[2.5]" />
              <Battery className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* 1. Header Area: Back Arrow + Segmented Mode Switcher */}
        <div className="pt-3 sm:pt-5 px-6 z-20">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleClose}
              className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white active:scale-95 transition-all cursor-pointer"
              title="Close"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
            </button>

            {/* Segmented Expense / Add Money Toggle */}
            <div className="bg-[#14141A] p-1 rounded-full flex items-center border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setTxnType("expense")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  txnType === "expense"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setTxnType("income")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  txnType === "income"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Add money
              </button>
            </div>

            <div className="w-6" />
          </div>

          {/* Prominent Meta Bar: Account + Category + Date (Clean, visible, intuitive) */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {/* A. Account Selector */}
            <button
              type="button"
              onClick={() => setIsAccountPickerOpen(true)}
              className="bg-[#141418] hover:bg-[#1A1A20] active:scale-98 p-2.5 rounded-2xl flex flex-col items-center justify-center text-center transition-all border border-white/[0.06] cursor-pointer"
            >
              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Account</span>
              <span className="text-xs font-bold text-white truncate max-w-[95px] block mt-0.5">
                {activeAccount ? activeAccount.name : "Select"}
              </span>
            </button>

            {/* B. Category Selector (Opens Full Grid Modal - with icons!) */}
            <button
              type="button"
              onClick={() => setIsCategoryPickerOpen(true)}
              className="bg-[#141418] hover:bg-[#1A1A20] active:scale-98 p-2.5 rounded-2xl flex flex-col items-center justify-center text-center transition-all border border-white/[0.06] cursor-pointer"
            >
              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Category</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs font-bold text-white truncate max-w-[85px] block">
                  {selectedCategory || "Choose"}
                </span>
              </div>
            </button>

            {/* C. Direct Date Selector */}
            <div className="relative bg-[#141418] hover:bg-[#1A1A20] active:scale-98 p-2.5 rounded-2xl flex flex-col items-center justify-center text-center transition-all border border-white/[0.06] cursor-pointer">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Date</span>
              <span className="text-xs font-bold text-white block mt-0.5">
                {dateDisplayLabel}
              </span>
              <input
                type="date"
                value={txnDate}
                onChange={(e) => {
                  if (e.target.value) setTxnDate(e.target.value);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Select transaction date"
              />
            </div>
          </div>
        </div>

        {/* 2. Main Body: Amount Display + Calculator Actions + Keypad */}
        <div className="flex-1 flex flex-col justify-between px-6 pt-2 pb-6 z-10">
          {/* Centered Amount Display (Bigger text with currency symbol) */}
          <div className="text-center my-auto py-2">
            {mathExpression && (
              <div className="text-sm font-mono text-purple-300 font-semibold mb-1">
                {mathExpression}
              </div>
            )}

            <div className="flex items-center justify-center font-sans tracking-tight">
              <span className="text-4xl sm:text-5xl font-light text-neutral-400 mr-2 select-none">
                {currencySymbol}
              </span>
              <motion.span
                key={amountStr}
                initial={{ scale: 0.98 }}
                animate={{ scale: 1 }}
                className="text-7xl sm:text-8xl font-bold tracking-tight text-white leading-none font-sans"
              >
                {amountStr}
              </motion.span>
            </div>

            {/* Note & Calculator Pill Row (Inspired directly by user reference image) */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {/* "Add a note (+)" Pill */}
              <button
                type="button"
                onClick={() => setShowNoteInput(!showNoteInput)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                  description
                    ? "bg-[#202028] text-white border-white/20"
                    : "bg-[#14141A] hover:bg-[#1A1A22] text-neutral-300 border-white/[0.08]"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 text-neutral-400" />
                <span>{description ? description : "Add a note"}</span>
                <span className="text-neutral-400 font-bold ml-0.5">{description ? "✎" : "+"}</span>
              </button>

              {/* Inline Calculator Toggle Button (+- / ×÷ pill matching reference image) */}
              <button
                type="button"
                onClick={() => setShowCalculatorOperators(!showCalculatorOperators)}
                className={`p-1.5 px-2.5 rounded-full text-xs font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                  showCalculatorOperators
                    ? "bg-purple-600/30 text-purple-300 border-purple-500/40 shadow-sm"
                    : "bg-[#14141A] hover:bg-[#1A1A22] text-neutral-300 border-white/[0.08]"
                }`}
                title="Calculator operators"
              >
                <span className="text-[11px] font-mono leading-none tracking-tight">
                  + − / ×
                </span>
              </button>

              {/* Split Expense Pill (if expense) */}
              {txnType === "expense" && (
                <button
                  type="button"
                  onClick={() => setIsSplitEnabled(!isSplitEnabled)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border flex items-center gap-1 ${
                    isSplitEnabled
                      ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/40"
                      : "bg-[#14141A] hover:bg-[#1A1A22] text-neutral-400 border-white/[0.08]"
                  }`}
                >
                  <Users className="h-3 w-3" />
                  <span>{isSplitEnabled ? `Split (${splitCount})` : "Split"}</span>
                </button>
              )}
            </div>

            {/* Note Input (Smooth dropdown when tapped) */}
            <AnimatePresence>
              {showNoteInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 max-w-[280px] mx-auto overflow-hidden"
                >
                  <input
                    type="text"
                    placeholder="Enter description / note..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    autoFocus
                    className="w-full bg-[#141418] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/40"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Math Operator Buttons (+, -, ×, ÷) */}
            <AnimatePresence>
              {showCalculatorOperators && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-center justify-center gap-2 mt-3"
                >
                  {(["+", "-", "×", "÷"] as const).map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => handleOperator(op)}
                      className="w-10 h-10 rounded-2xl bg-[#1A1A22] hover:bg-[#242430] active:scale-95 text-white font-bold text-base flex items-center justify-center border border-white/[0.08] transition-all cursor-pointer"
                    >
                      {op}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {errorMessage && (
              <div className="text-xs text-rose-400 font-medium mt-3 bg-rose-500/10 py-1 px-3 rounded-full inline-block">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Account Card (Cosmic artwork circle + Account Name + Available Balance + "Wallets" switch button) */}
          <div className="mb-4">
            <div className="bg-[#141418] border border-white/[0.08] rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                {/* Cosmic artwork thumbnail */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-purple-700 via-indigo-600 to-sky-400 p-[1px] shrink-0 shadow-sm flex items-center justify-center relative">
                  <div className="w-full h-full rounded-full bg-[#181028] flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-[radial-gradient(circle_at_30%_30%,#c084fc,transparent_60%),radial-gradient(circle_at_70%_70%,#38bdf8,#1e1b4b_80%)] opacity-95" />
                  </div>
                </div>

                {/* Account Name & Available Balance */}
                <div className="text-left">
                  <div className="text-sm font-semibold text-white leading-tight">
                    {activeAccount?.name || "Wallet 02"}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5 font-normal">
                    {activeAccount
                      ? `${formatCurrency(activeAccount.balance_cents, activeAccount.currency)} Available`
                      : "$478.00 Available"}
                  </div>
                </div>
              </div>

              {/* "Wallets" Pill Button */}
              <button
                type="button"
                onClick={() => setIsAccountPickerOpen(true)}
                className="bg-[#222228] hover:bg-[#2c2c34] active:scale-95 text-xs font-semibold text-white px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-sm"
              >
                Wallets
              </button>
            </div>
          </div>

          {/* Clean Keypad (Bigger digits text-2xl sm:text-3xl) */}
          <div className="w-full max-w-[300px] mx-auto mb-4">
            <div className="grid grid-cols-3 gap-y-4 gap-x-10 text-center">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  className="h-12 text-2xl sm:text-3xl font-light text-white hover:text-white/80 active:scale-90 transition-transform flex items-center justify-center cursor-pointer select-none"
                >
                  {digit}
                </button>
              ))}

              {/* Row 4: . , 0 , Backspace */}
              <button
                type="button"
                onClick={() => handleDigit(".")}
                className="h-12 text-2xl sm:text-3xl font-light text-white hover:text-white/80 active:scale-90 transition-transform flex items-center justify-center cursor-pointer select-none"
              >
                .
              </button>
              <button
                type="button"
                onClick={() => handleDigit("0")}
                className="h-12 text-2xl sm:text-3xl font-light text-white hover:text-white/80 active:scale-90 transition-transform flex items-center justify-center cursor-pointer select-none"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-12 text-white hover:text-white/80 active:scale-90 transition-transform flex items-center justify-center cursor-pointer select-none"
              >
                <Delete className="h-6 w-6 stroke-[1.8]" />
              </button>
            </div>
          </div>

          {/* Bottom Action Button: "Continue" (Crisp white pill) */}
          <div className="pt-1 pb-1">
            <button
              type="button"
              onClick={handleContinue}
              disabled={animStage !== "idle" || parsedAmount <= 0}
              className="w-full py-4 rounded-full font-bold text-base sm:text-lg bg-white text-black hover:bg-neutral-100 active:scale-[0.98] transition-all shadow-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>Continue</span>
              {parsedAmount > 0 && (
                <span className="opacity-70 font-medium text-sm sm:text-base">
                  • {currencySymbol}{parsedAmount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. EXACT VIDEO ANIMATION OVERLAY: "Topping up wallet" -> "Wallet topped up" */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {animStage !== "idle" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 z-50 bg-black/80 backdrop-blur-2xl flex flex-col items-center justify-center overflow-hidden"
            >
              {/* STAGE A: Bottom Glowing Aurora (Present during "Topping up wallet") */}
              {animStage === "topping_up" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 50 }}
                  animate={{ 
                    opacity: [0.8, 1, 0.85], 
                    scale: [1, 1.06, 1],
                    y: 0 
                  }}
                  transition={{ 
                    duration: 2.2, 
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                  className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-[340px] h-[190px] rounded-full blur-[75px] pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, rgba(236,72,153,0.95) 0%, rgba(147,51,234,0.9) 35%, rgba(245,158,11,0.7) 70%, transparent 100%)",
                  }}
                />
              )}

              {/* STAGE B: Upward Shooting Aurora Bloom (Fires during transition to "topped_up") */}
              {animStage === "topped_up" && (
                <motion.div
                  initial={{ y: 200, scale: 0.85, opacity: 0.95 }}
                  animate={{ 
                    y: -360, 
                    scale: 1.35, 
                    opacity: [0.95, 0.9, 0.6, 0] 
                  }}
                  transition={{ 
                    duration: 1.4, 
                    ease: [0.2, 0.8, 0.2, 1] 
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[380px] h-[240px] rounded-full blur-[85px] pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, rgba(236,72,153,0.95) 0%, rgba(147,51,234,0.9) 35%, rgba(245,158,11,0.7) 70%, transparent 100%)",
                  }}
                />
              )}

              {/* Center Status Feedback: Ring Spinner / Checkmark + Text (Bigger text) */}
              <div className="relative z-10 flex items-center justify-center gap-3">
                <AnimatePresence mode="wait">
                  {animStage === "topping_up" ? (
                    <motion.div
                      key="topping-up-content"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-3"
                    >
                      {/* Hollow Ring Spinner */}
                      <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span className="text-white text-base sm:text-lg font-semibold tracking-tight">
                        Topping up wallet
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="topped-up-content"
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 18 
                      }}
                      className="flex items-center gap-3"
                    >
                      {/* Solid White Circle with Dark Checkmark */}
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                        <Check className="w-3 h-3 text-black stroke-[3.5]" />
                      </div>
                      <span className="text-white text-base sm:text-lg font-semibold tracking-tight">
                        Wallet topped up
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* 4. MODAL OVERLAY: Accounts / Wallets Picker Modal                          */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isAccountPickerOpen && (
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="absolute inset-0 z-40 bg-[#0C0C10] p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <h3 className="text-base font-bold text-white">Select Wallet</h3>
                  <button
                    type="button"
                    onClick={() => setIsAccountPickerOpen(false)}
                    className="p-1.5 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-2.5 mt-4 max-h-[460px] overflow-y-auto">
                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setSelectedAccountId(acc.id);
                        setIsAccountPickerOpen(false);
                      }}
                      className={`w-full p-3.5 rounded-2xl flex items-center justify-between transition-all border cursor-pointer ${
                        selectedAccountId === acc.id
                          ? "bg-[#1E1E26] text-white border-white/30 shadow-md font-bold"
                          : "bg-[#141418] hover:bg-[#181820] text-neutral-300 border-white/5 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${selectedAccountId === acc.id ? "bg-white/20 text-white" : "bg-neutral-800 text-neutral-400"}`}>
                          <WalletIcon className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-bold text-white">{acc.name}</div>
                          <div className="text-[10px] uppercase font-mono text-neutral-400">
                            •••• {acc.account_number ? acc.account_number.slice(-4) : "7642"}
                          </div>
                        </div>
                      </div>

                      <div className="font-sans font-bold text-xs text-white">
                        {formatCurrency(acc.balance_cents, acc.currency)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* 5. MODAL OVERLAY: Category Picker Grid Modal (Rich category grid with icons)*/}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isCategoryPickerOpen && (
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="absolute inset-0 z-40 bg-[#0C0C10] p-6 flex flex-col justify-between"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-base font-bold text-white">Select Category</h3>
                  <button
                    type="button"
                    onClick={() => setIsCategoryPickerOpen(false)}
                    className="p-1.5 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Search */}
                <div className="relative my-3">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search or add category..."
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    className="w-full bg-[#141418] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                  />
                </div>

                {/* Categories Grid */}
                <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 my-1 max-h-[380px]">
                  {filteredCategories.map((catName) => (
                    <button
                      key={catName}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(catName);
                        setIsCategoryPickerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-left transition-all border cursor-pointer ${
                        selectedCategory === catName
                          ? "bg-[#252530] text-white border-white/30 font-bold shadow-sm"
                          : "bg-[#141418] hover:bg-[#1A1A22] text-neutral-300 border-white/5 font-medium"
                      }`}
                    >
                      <div className={`p-1.5 rounded-xl ${selectedCategory === catName ? "bg-white/15" : "bg-neutral-800/80"}`}>
                        {getCategoryIcon(catName)}
                      </div>
                      <span className="text-xs truncate">{catName}</span>
                    </button>
                  ))}
                </div>

                {/* Add Custom Category Button */}
                {categorySearchQuery.trim() && !categories.some(c => c.toLowerCase() === categorySearchQuery.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={handleAddCustomCategory}
                    className="mt-3 w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add &quot;{categorySearchQuery.trim()}&quot; as New Category</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
