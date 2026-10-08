"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Check, 
  ChevronDown, 
  Calendar as CalendarIcon, 
  Tag, 
  FileText, 
  Delete, 
  Users, 
  Wallet,
  Search,
  Plus,
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Film,
  HeartPulse,
  Zap,
  Home,
  Briefcase,
  Laptop,
  TrendingUp,
  ArrowRightLeft,
  HandCoins,
  ShoppingCart,
  MoreHorizontal
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

// Icon mapper for categories
const getCategoryIcon = (category: string) => {
  const lower = category.toLowerCase();
  if (lower.includes("food") || lower.includes("dining") || lower.includes("restaurant") || lower.includes("cafe")) {
    return <UtensilsCrossed className="h-4 w-4 text-amber-500" />;
  }
  if (lower.includes("transport") || lower.includes("cab") || lower.includes("fuel") || lower.includes("uber")) {
    return <Car className="h-4 w-4 text-blue-500" />;
  }
  if (lower.includes("grocer") || lower.includes("mart") || lower.includes("supermarket")) {
    return <ShoppingCart className="h-4 w-4 text-emerald-500" />;
  }
  if (lower.includes("shop") || lower.includes("clothing") || lower.includes("amazon")) {
    return <ShoppingBag className="h-4 w-4 text-pink-500" />;
  }
  if (lower.includes("entertain") || lower.includes("movie") || lower.includes("ott") || lower.includes("music")) {
    return <Film className="h-4 w-4 text-purple-500" />;
  }
  if (lower.includes("health") || lower.includes("med") || lower.includes("doctor")) {
    return <HeartPulse className="h-4 w-4 text-rose-500" />;
  }
  if (lower.includes("util") || lower.includes("bill") || lower.includes("electric") || lower.includes("wifi")) {
    return <Zap className="h-4 w-4 text-yellow-500" />;
  }
  if (lower.includes("rent") || lower.includes("house") || lower.includes("pg")) {
    return <Home className="h-4 w-4 text-orange-500" />;
  }
  if (lower.includes("salary") || lower.includes("wage") || lower.includes("paycheck")) {
    return <Briefcase className="h-4 w-4 text-emerald-600" />;
  }
  if (lower.includes("freelance") || lower.includes("consult") || lower.includes("gig")) {
    return <Laptop className="h-4 w-4 text-teal-500" />;
  }
  if (lower.includes("invest") || lower.includes("stock") || lower.includes("mutual") || lower.includes("dividend")) {
    return <TrendingUp className="h-4 w-4 text-indigo-500" />;
  }
  if (lower.includes("transfer")) {
    return <ArrowRightLeft className="h-4 w-4 text-cyan-500" />;
  }
  if (lower.includes("owe") || lower.includes("debt") || lower.includes("split")) {
    return <HandCoins className="h-4 w-4 text-purple-500" />;
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

  // Primary state
  const [txnType, setTxnType] = useState<"expense" | "income">(defaultType);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [amountStr, setAmountStr] = useState<string>("0");
  const [mathExpression, setMathExpression] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [txnDate, setTxnDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

  // Modal overlays
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");

  // Bill splitting state
  const [isSplitEnabled, setIsSplitEnabled] = useState(false);
  const [splitCount, setSplitCount] = useState(2);

  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  // Set default account when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // Sync defaultType when changed externally
  useEffect(() => {
    setTxnType(defaultType);
  }, [defaultType]);

  // Auto-set sensible default category based on type
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

  // Quick date label helper
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

  // Filtered categories for the category picker
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return categories;
    return categories.filter((c) =>
      c.toLowerCase().includes(categorySearchQuery.trim().toLowerCase())
    );
  }, [categories, categorySearchQuery]);

  // Numerical amount evaluation
  const parsedAmount = useMemo(() => {
    try {
      if (mathExpression) {
        const sanitized = (mathExpression + amountStr).replace(/[^0-9+\-*/.]/g, "");
        // eslint-disable-next-line no-eval
        const result = Function(`'use strict'; return (${sanitized})`)();
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
      setAmountStr("0");
    } else {
      setAmountStr(amountStr.slice(0, -1));
    }
  };

  const handleOperator = (op: string) => {
    try {
      const current = parseFloat(amountStr) || 0;
      setMathExpression(`${mathExpression} ${current} ${op}`);
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

  // Submit transaction
  const handleSaveTransaction = async () => {
    if (parsedAmount <= 0) {
      setErrorMessage("Please enter an amount greater than ₹0");
      return;
    }
    if (!selectedAccountId) {
      setErrorMessage("Please select an account");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const amountCents = Math.round(parsedAmount * 100);

    try {
      const res = await api.transactions.create({
        amount_cents: amountCents,
        type: txnType,
        account_id: selectedAccountId,
        category: selectedCategory || (txnType === "expense" ? "Food & Dining" : "Salary"),
        description: description.trim() || (txnType === "expense" ? "Expense entry" : "Income entry"),
        txn_date: txnDate,
        is_included: true,
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      // Handle split if enabled
      if (isSplitEnabled && txnType === "expense" && splitCount > 1) {
        const roommateShareCents = Math.round(amountCents * ((splitCount - 1) / splitCount));
        if (roommateShareCents > 0) {
          await api.transactions.create({
            amount_cents: roommateShareCents,
            type: "expense",
            account_id: selectedAccountId,
            category: "Owed to Me",
            description: `Split share: ${description.trim() || "Shared Bill"}`,
            txn_date: txnDate,
            is_included: false,
          });
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["budget"] });

      // Trigger animated green success screen
      setShowSuccessScreen(true);

      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to record transaction");
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowSuccessScreen(false);
    setAmountStr("0");
    setMathExpression("");
    setDescription("");
    setIsSplitEnabled(false);
    setIsAccountPickerOpen(false);
    setIsCategoryPickerOpen(false);
    setIsSubmitting(false);
    setErrorMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md select-none overflow-hidden">
      {/* 1. Full-screen Success Screen (Matching Reference Video Frame 14) */}
      {showSuccessScreen ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="w-full h-full sm:h-auto sm:max-w-md sm:rounded-3xl bg-[#10B981] p-8 flex flex-col items-center justify-center text-white text-center cursor-pointer min-h-[620px]"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 14, stiffness: 220 }}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-6 shadow-2xl"
          >
            <Check className="h-10 w-10 text-[#10B981] stroke-[3]" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <span className="text-4xl sm:text-5xl font-extrabold font-sans tracking-tight block">
              {formatCurrency(Math.round(parsedAmount * 100), activeAccount?.currency || "INR")}
            </span>
            <span className="text-base font-bold opacity-90 mt-2 block">
              {txnType === "expense" ? "Expense Recorded" : "Income Recorded"}
            </span>
            <span className="text-xs opacity-80 mt-1 block font-medium">
              {selectedCategory} • {activeAccount?.name || "Account"}
            </span>
          </motion.div>

          <span className="text-xs opacity-70 mt-12 tracking-wider uppercase font-semibold">
            Tap anywhere to close
          </span>
        </motion.div>
      ) : (
        /* 2. Main Calculator Payment Sheet */
        <motion.div
          initial={{ y: "100%", opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="w-full max-w-md bg-white text-[#111317] rounded-t-[32px] sm:rounded-[32px] shadow-2xl p-5 sm:p-7 flex flex-col justify-between max-h-[96vh] overflow-y-auto relative"
        >
          <div>
            {/* Top Row: Close Button + Expense/Income Toggle */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleClose}
                className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-black flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              {/* Segmented Control: Expense vs Income (Clean, Standard Terminology) */}
              <div className="bg-[#EEF1F4] p-1 rounded-full flex items-center shadow-inner">
                <button
                  type="button"
                  onClick={() => setTxnType("expense")}
                  className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    txnType === "expense"
                      ? "bg-white text-black shadow-sm"
                      : "text-neutral-500 hover:text-black"
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setTxnType("income")}
                  className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    txnType === "income"
                      ? "bg-white text-black shadow-sm"
                      : "text-neutral-500 hover:text-black"
                  }`}
                >
                  Income
                </button>
              </div>

              <div className="w-9" />
            </div>

            {/* Prominent Meta Bar: Account + Category + Direct Date */}
            <div className="grid grid-cols-3 gap-2 my-2">
              {/* 1. Account Selector */}
              <button
                type="button"
                onClick={() => setIsAccountPickerOpen(true)}
                className="bg-neutral-100 hover:bg-neutral-200 p-2 rounded-2xl flex flex-col items-center justify-center text-center transition-all border border-neutral-200/50 cursor-pointer active:scale-95"
              >
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Account</span>
                <span className="text-xs font-bold text-neutral-800 truncate max-w-[95px] block mt-0.5">
                  {activeAccount ? activeAccount.name : "Select"}
                </span>
              </button>

              {/* 2. Category Selector (Opens Full Grid Modal - No Horizontal Scroll!) */}
              <button
                type="button"
                onClick={() => setIsCategoryPickerOpen(true)}
                className="bg-neutral-100 hover:bg-neutral-200 p-2 rounded-2xl flex flex-col items-center justify-center text-center transition-all border border-neutral-200/50 cursor-pointer active:scale-95"
              >
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Category</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs font-bold text-neutral-800 truncate max-w-[85px] block">
                    {selectedCategory || "Choose"}
                  </span>
                </div>
              </button>

              {/* 3. Direct Date Selector (Opens native calendar immediately on tap) */}
              <div className="relative bg-neutral-100 hover:bg-neutral-200 p-2 rounded-2xl flex flex-col items-center justify-center text-center transition-all border border-neutral-200/50 cursor-pointer active:scale-95 group">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Date</span>
                <span className="text-xs font-bold text-neutral-800 block mt-0.5">
                  {dateDisplayLabel}
                </span>
                <input
                  type="date"
                  value={txnDate}
                  onChange={(e) => {
                    if (e.target.value) setTxnDate(e.target.value);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Click to select transaction date"
                />
              </div>
            </div>

            {/* Huge Bold Dynamic Amount Display */}
            <div className="text-center my-3">
              {mathExpression && (
                <div className="text-xs font-mono text-neutral-400 mb-0.5">
                  {mathExpression}
                </div>
              )}
              <div className="flex items-center justify-center font-sans tracking-tight">
                <span className="text-4xl sm:text-5xl font-extrabold text-neutral-900 mr-1">
                  ₹
                </span>
                <span className="text-5xl sm:text-6xl font-black text-neutral-900">
                  {amountStr}
                </span>
                <span className="w-1 h-11 bg-neutral-300 ml-1 rounded-full animate-pulse inline-block" />
              </div>
              <span className="text-[11px] text-neutral-400 font-semibold mt-1 block">
                Available: {activeAccount ? formatCurrency(activeAccount.balance_cents, activeAccount.currency) : "₹ 0"}
              </span>
            </div>

            {/* Quick Math Operators Bar (+, −, ×, ÷) */}
            <div className="flex items-center justify-center gap-3.5 my-2.5 text-neutral-600 font-bold text-lg">
              <button
                type="button"
                onClick={() => handleOperator("+")}
                className="w-11 h-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 active:scale-90 transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => handleOperator("-")}
                className="w-11 h-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 active:scale-90 transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => handleOperator("*")}
                className="w-11 h-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 active:scale-90 transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                ×
              </button>
              <button
                type="button"
                onClick={() => handleOperator("/")}
                className="w-11 h-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 active:scale-90 transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                ÷
              </button>
            </div>

            {/* Numeric Keypad (Matching Reference Video Frame 8) */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[320px] mx-auto my-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleDigit(num)}
                  className="h-13 rounded-2xl bg-[#F6F7F9] hover:bg-[#EEF0F3] active:bg-[#E2E5E9] active:scale-95 text-xl font-bold text-neutral-800 transition-all flex items-center justify-center cursor-pointer shadow-xs"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleBackspace}
                className="h-13 rounded-2xl bg-[#F6F7F9] hover:bg-[#EEF0F3] active:bg-[#E2E5E9] active:scale-95 text-neutral-800 transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>

            {/* Note & Split Row */}
            <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center gap-2">
              <input
                type="text"
                placeholder="Optional note / description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex-1 bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-medium text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-400"
              />

              {txnType === "expense" && (
                <button
                  type="button"
                  onClick={() => setIsSplitEnabled(!isSplitEnabled)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSplitEnabled
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>{isSplitEnabled ? "Split (2)" : "Split"}</span>
                </button>
              )}
            </div>

            {errorMessage && (
              <div className="text-xs text-rose-500 font-semibold text-center mt-2">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Confirm Button */}
          <div className="pt-3">
            <button
              type="button"
              onClick={handleSaveTransaction}
              disabled={isSubmitting || parsedAmount <= 0}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] cursor-pointer ${
                parsedAmount > 0
                  ? "bg-[#111317] hover:bg-black text-white shadow-neutral-900/20"
                  : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <span>Recording...</span>
              ) : (
                <>
                  <span>Confirm {txnType === "expense" ? "Expense" : "Income"}</span>
                  <span>•</span>
                  <span>{formatCurrency(Math.round(parsedAmount * 100), activeAccount?.currency || "INR")}</span>
                </>
              )}
            </button>
          </div>

          {/* ================= MODAL OVERLAYS ================= */}

          {/* A. Full Category Picker Modal (ALL categories visible in a clean responsive grid) */}
          <AnimatePresence>
            {isCategoryPickerOpen && (
              <div className="absolute inset-0 z-40 bg-white rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-150">
                <div className="flex flex-col h-full">
                  {/* Category Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <h3 className="text-base font-bold text-neutral-900">Select Category</h3>
                    <button
                      type="button"
                      onClick={() => setIsCategoryPickerOpen(false)}
                      className="p-1 rounded-full text-neutral-400 hover:text-black cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative my-3">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search or add category..."
                      value={categorySearchQuery}
                      onChange={(e) => setCategorySearchQuery(e.target.value)}
                      className="w-full bg-neutral-100 border border-neutral-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  {/* All Categories Grid */}
                  <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2 my-1 max-h-[360px]">
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
                            ? "bg-black text-white border-black shadow-md font-bold"
                            : "bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200/60 font-semibold"
                        }`}
                      >
                        <div className={`p-1.5 rounded-xl ${selectedCategory === catName ? "bg-white/20" : "bg-white shadow-xs"}`}>
                          {getCategoryIcon(catName)}
                        </div>
                        <span className="text-xs truncate">{catName}</span>
                      </button>
                    ))}
                  </div>

                  {/* Add Custom Category Button (if search doesn't match an existing one) */}
                  {categorySearchQuery.trim() && !categories.some(c => c.toLowerCase() === categorySearchQuery.trim().toLowerCase()) && (
                    <button
                      type="button"
                      onClick={handleAddCustomCategory}
                      className="mt-3 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add &quot;{categorySearchQuery.trim()}&quot; as New Category</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* B. Account Picker Modal */}
          <AnimatePresence>
            {isAccountPickerOpen && (
              <div className="absolute inset-0 z-40 bg-white rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-150">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <h3 className="text-base font-bold text-neutral-900">Select Account</h3>
                    <button
                      type="button"
                      onClick={() => setIsAccountPickerOpen(false)}
                      className="p-1 rounded-full text-neutral-400 hover:text-black cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto">
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
                            ? "bg-black text-white border-black shadow-md font-bold"
                            : "bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200/60 font-semibold"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${selectedAccountId === acc.id ? "bg-white/20" : "bg-neutral-200"}`}>
                            <Wallet className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold">{acc.name}</div>
                            <div className={`text-[10px] uppercase font-mono ${selectedAccountId === acc.id ? "text-white/70" : "text-neutral-400"}`}>
                              •••• {acc.account_number ? acc.account_number.slice(-4) : "7642"}
                            </div>
                          </div>
                        </div>

                        <div className="font-sans font-bold text-xs">
                          {formatCurrency(acc.balance_cents, acc.currency)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
