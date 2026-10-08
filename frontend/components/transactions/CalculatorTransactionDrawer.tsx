"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Check, 
  ChevronDown, 
  Calendar, 
  Tag, 
  FileText, 
  Delete, 
  ArrowLeft,
  Users,
  CreditCard,
  Wallet
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

export default function CalculatorTransactionDrawer({
  isOpen,
  onClose,
  defaultType = "expense",
}: CalculatorTransactionDrawerProps) {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useAccounts();
  const { categories } = useCategories();

  // State
  const [txnType, setTxnType] = useState<"expense" | "income">(defaultType);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [amountStr, setAmountStr] = useState<string>("0");
  const [mathExpression, setMathExpression] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [txnDate, setTxnDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

  // Split state
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

  // Sync defaultType
  useEffect(() => {
    setTxnType(defaultType);
  }, [defaultType]);

  // Set default category
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  const activeAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  }, [accounts, selectedAccountId]);

  // Parse numerical amount
  const parsedAmount = useMemo(() => {
    try {
      if (mathExpression) {
        // Safe evaluation of basic arithmetic expression
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
      // Limit to 2 decimal places
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

  const handleClear = () => {
    setAmountStr("0");
    setMathExpression("");
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

  // Submission
  const handleSaveTransaction = async () => {
    if (parsedAmount <= 0) {
      setErrorMessage("Please enter an amount greater than 0");
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
        category: selectedCategory || (txnType === "expense" ? "General" : "Income"),
        description: description.trim() || (txnType === "expense" ? "Payment" : "Received Funds"),
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
            description: `Split: ${description.trim() || "Shared Expense"}`,
            txn_date: txnDate,
            is_included: false,
          });
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["budget"] });

      // Trigger animated success screen
      setShowSuccessScreen(true);

      setTimeout(() => {
        handleClose();
      }, 1600);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save transaction");
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowSuccessScreen(false);
    setAmountStr("0");
    setMathExpression("");
    setDescription("");
    setShowDetailsDrawer(false);
    setIsSubmitting(false);
    setErrorMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md select-none overflow-hidden">
        {/* Success Screen from Reference Video Frame 14 */}
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
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-6 shadow-xl"
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
              <span className="text-sm font-semibold opacity-90 mt-2 block">
                {txnType === "expense" ? "Payment Recorded" : "Income Added"}
              </span>
              <span className="text-xs opacity-75 mt-1 block">
                {activeAccount?.name || "Account"}
              </span>
            </motion.div>

            <span className="text-xs opacity-60 mt-12 tracking-wider uppercase font-medium">
              Tap anywhere to close
            </span>
          </motion.div>
        ) : (
          /* Main Calculator Payment Sheet (Matching Reference Video Frame 8 & 11) */
          <motion.div
            initial={{ y: "100%", opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="w-full max-w-md bg-white text-[#111317] rounded-t-[32px] sm:rounded-[32px] shadow-2xl p-6 sm:p-7 flex flex-col justify-between max-h-[95vh] overflow-y-auto"
          >
            {/* Header: Segmented Control & Close */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handleClose}
                  className="p-2 -ml-2 rounded-full text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Segmented Control: Send (Expense) vs Request (Income) */}
                <div className="bg-[#F1F3F5] p-1 rounded-full flex items-center shadow-inner">
                  <button
                    onClick={() => setTxnType("expense")}
                    className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
                      txnType === "expense"
                        ? "bg-white text-black shadow-sm"
                        : "text-neutral-500 hover:text-black"
                    }`}
                  >
                    Send
                  </button>
                  <button
                    onClick={() => setTxnType("income")}
                    className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
                      txnType === "income"
                        ? "bg-white text-black shadow-sm"
                        : "text-neutral-500 hover:text-black"
                    }`}
                  >
                    Request
                  </button>
                </div>

                <div className="w-8" />
              </div>

              {/* Account Dropdown Picker */}
              <div className="relative flex justify-center mb-4">
                <button
                  onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-black py-1 px-3 rounded-full hover:bg-neutral-100 transition-all border border-transparent hover:border-neutral-200"
                >
                  <span>{activeAccount ? `${activeAccount.name} • ${formatCurrency(activeAccount.balance_cents, activeAccount.currency)}` : "Select Account"}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
                </button>

                {isAccountDropdownOpen && (
                  <div className="absolute top-8 z-30 bg-white border border-neutral-200 rounded-2xl shadow-xl p-2 w-64 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95">
                    {accounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          setSelectedAccountId(acc.id);
                          setIsAccountDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          selectedAccountId === acc.id
                            ? "bg-neutral-100 font-bold text-black"
                            : "hover:bg-neutral-50 text-neutral-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Wallet className="h-3.5 w-3.5 text-neutral-500" />
                          <span className="truncate">{acc.name}</span>
                        </div>
                        <span className="font-mono text-[11px] text-neutral-500">
                          {formatCurrency(acc.balance_cents, acc.currency)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Huge Bold Dynamic Amount Display */}
              <div className="text-center my-3">
                {mathExpression && (
                  <div className="text-xs font-mono text-neutral-400 mb-1">
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
                <span className="text-xs text-neutral-400 font-medium mt-1 block">
                  Available {activeAccount ? formatCurrency(activeAccount.balance_cents, activeAccount.currency) : "₹ 0"}
                </span>
              </div>

              {/* Quick Math Operators Bar */}
              <div className="flex items-center justify-center gap-4 my-3 text-neutral-500 font-bold text-lg">
                <button
                  onClick={() => handleOperator("+")}
                  className="w-10 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 transition-all flex items-center justify-center"
                >
                  +
                </button>
                <button
                  onClick={() => handleOperator("-")}
                  className="w-10 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 transition-all flex items-center justify-center"
                >
                  −
                </button>
                <button
                  onClick={() => handleOperator("*")}
                  className="w-10 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 transition-all flex items-center justify-center"
                >
                  ×
                </button>
                <button
                  onClick={() => handleOperator("/")}
                  className="w-10 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 transition-all flex items-center justify-center"
                >
                  ÷
                </button>
              </div>

              {/* Numeric Keypad (Matching Reference Video Frame 8) */}
              <div className="grid grid-cols-3 gap-2.5 max-w-[320px] mx-auto my-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleDigit(num)}
                    className="h-14 rounded-2xl bg-[#F6F7F9] hover:bg-[#EEF0F3] active:bg-[#E2E5E9] active:scale-95 text-xl font-bold text-neutral-800 transition-all flex items-center justify-center shadow-xs"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={handleBackspace}
                  className="h-14 rounded-2xl bg-[#F6F7F9] hover:bg-[#EEF0F3] active:bg-[#E2E5E9] active:scale-95 text-neutral-800 transition-all flex items-center justify-center shadow-xs"
                >
                  <Delete className="h-5 w-5" />
                </button>
              </div>

              {/* Details Drawer Trigger & Quick Form */}
              <div className="mt-4 pt-3 border-t border-neutral-100">
                <div className="flex items-center justify-between gap-2 mb-3">
                  {/* Category Pill Picker */}
                  <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1.5 py-1">
                    {categories.slice(0, 6).map((catName) => (
                      <button
                        key={catName}
                        type="button"
                        onClick={() => setSelectedCategory(catName)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                          selectedCategory === catName
                            ? "bg-black text-white"
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                        }`}
                      >
                        {catName}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDetailsDrawer(!showDetailsDrawer)}
                    className="text-xs font-semibold text-neutral-500 hover:text-black shrink-0 px-2 py-1 rounded-lg hover:bg-neutral-100"
                  >
                    {showDetailsDrawer ? "Hide Note" : "+ Note"}
                  </button>
                </div>

                {showDetailsDrawer && (
                  <div className="space-y-2.5 pb-2 animate-in fade-in">
                    <input
                      type="text"
                      placeholder="Add note or description..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-neutral-100 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs font-medium text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
                    />

                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={txnDate}
                        onChange={(e) => setTxnDate(e.target.value)}
                        className="bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-medium text-neutral-800 focus:outline-none"
                      />

                      {txnType === "expense" && (
                        <button
                          type="button"
                          onClick={() => setIsSplitEnabled(!isSplitEnabled)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                            isSplitEnabled ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>{isSplitEnabled ? "Split 50/50" : "Split"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="text-xs text-rose-500 font-medium text-center my-2">
                  {errorMessage}
                </div>
              )}
            </div>

            {/* Bottom Action Button */}
            <div className="pt-2">
              <button
                onClick={handleSaveTransaction}
                disabled={isSubmitting || parsedAmount <= 0}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] ${
                  parsedAmount > 0
                    ? "bg-[#111317] hover:bg-black text-white cursor-pointer shadow-neutral-900/20"
                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <span>Recording...</span>
                ) : (
                  <>
                    <span>Confirm {txnType === "expense" ? "Payment" : "Income"}</span>
                    <span>•</span>
                    <span>{formatCurrency(Math.round(parsedAmount * 100), activeAccount?.currency || "INR")}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
}
