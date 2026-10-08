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
  SlidersHorizontal,
  Users
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
  const { categories, addCategory } = useCategories();

  // Core transaction state
  const [txnType, setTxnType] = useState<"expense" | "income">(defaultType);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [amountStr, setAmountStr] = useState<string>("100");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [txnDate, setTxnDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

  // Modals & Pickers
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [showOptionsBar, setShowOptionsBar] = useState(false);

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

  // Set default category
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

  // Numerical amount evaluation
  const parsedAmount = useMemo(() => {
    const val = parseFloat(amountStr);
    return isNaN(val) ? 0 : Math.max(0, val);
  }, [amountStr]);

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
      if (amountStr.length < 8) {
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
    setAmountStr("100");
    setDescription("");
    setIsSplitEnabled(false);
    setIsAccountPickerOpen(false);
    setIsCategoryPickerOpen(false);
    setErrorMessage(null);
    onClose();
  };

  // Execute transaction with the exact video animation sequence
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-2xl select-none overflow-hidden">
      {/* Phone Canvas Container (Pure deep black matching the video 720x720 mobile mockup) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full h-full sm:h-auto sm:max-w-[390px] sm:max-h-[810px] sm:rounded-[48px] bg-black text-white sm:border sm:border-white/10 sm:shadow-[0_25px_80px_rgba(0,0,0,0.95)] sm:ring-1 sm:ring-white/10 relative flex flex-col justify-between overflow-hidden"
      >
        {/* Dynamic Island / Top Phone Notch (Desktop only for authentic mockup feel) */}
        <div className="hidden sm:flex absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-neutral-900/90 rounded-full z-40 items-center justify-end px-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A1E]" />
        </div>

        {/* 1. Header & Status Bar Area */}
        <div className="pt-3 sm:pt-4 px-6 z-20">
          {/* iOS Status Bar Row */}
          <div className="flex items-center justify-between text-[11px] font-semibold text-white/90 pt-1 pb-3">
            <span>9:41</span>
            <div className="flex items-center gap-1.5 opacity-90">
              {/* Cellular icon */}
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

          {/* Navigation Bar: Back Arrow + Centered Title ("Add money") */}
          <div className="flex items-center justify-between py-2">
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 text-white/90 active:scale-90 transition-all cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
            </button>

            {/* Title with subtle toggle for Expense / Add money */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTxnType(txnType === "expense" ? "income" : "expense")}
                className="text-sm font-semibold text-white hover:text-white/80 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Tap to switch between Add money / Expense"
              >
                <span>{txnType === "income" ? "Add money" : "Add money"}</span>
              </button>
            </div>

            {/* Quick Settings / Options toggle */}
            <button
              type="button"
              onClick={() => setShowOptionsBar(!showOptionsBar)}
              className={`p-1.5 -mr-1.5 rounded-full transition-all cursor-pointer ${
                showOptionsBar ? "bg-white/20 text-white" : "hover:bg-white/10 text-white/60 hover:text-white"
              }`}
              title="More options (Category, Split, Note)"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Optional Category & Settings Pills Bar */}
          <AnimatePresence>
            {showOptionsBar && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-2 pb-1 overflow-hidden"
              >
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {/* Category Pill */}
                  <button
                    type="button"
                    onClick={() => setIsCategoryPickerOpen(true)}
                    className="px-3 py-1.5 rounded-full bg-[#18181C] hover:bg-[#222228] border border-white/10 text-xs text-white/90 font-medium flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                  >
                    <Tag className="h-3 w-3 text-purple-400" />
                    <span className="truncate max-w-[100px]">{selectedCategory || "Category"}</span>
                  </button>

                  {/* Mode Toggle */}
                  <button
                    type="button"
                    onClick={() => setTxnType(txnType === "expense" ? "income" : "expense")}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer border ${
                      txnType === "income"
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                        : "bg-[#18181C] border-white/10 text-white/80"
                    }`}
                  >
                    {txnType === "income" ? "Income / Top Up" : "Expense"}
                  </button>

                  {/* Split Pill */}
                  {txnType === "expense" && (
                    <button
                      type="button"
                      onClick={() => setIsSplitEnabled(!isSplitEnabled)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 shrink-0 transition-colors cursor-pointer border ${
                        isSplitEnabled
                          ? "bg-purple-600/30 border-purple-500/50 text-purple-300"
                          : "bg-[#18181C] border-white/10 text-white/70"
                      }`}
                    >
                      <Users className="h-3 w-3" />
                      <span>{isSplitEnabled ? "Split (2)" : "Split"}</span>
                    </button>
                  )}
                </div>

                {/* Optional Note row */}
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Optional note / description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#141416] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. Main Content Body (Amount Display + Account Card + Keypad) */}
        <div className="flex-1 flex flex-col justify-between px-6 pt-2 pb-6 z-10">
          {/* Centered Amount Display (Matching exact video typography) */}
          <div className="text-center my-auto py-2">
            <motion.div
              key={amountStr}
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              className="text-[64px] sm:text-[72px] font-bold tracking-tight text-white leading-none font-sans"
            >
              {amountStr}
            </motion.div>
            <div className="text-xs sm:text-sm font-semibold text-neutral-400 mt-2 tracking-wide uppercase">
              {activeAccount?.currency || "USD"}
            </div>

            {errorMessage && (
              <div className="text-xs text-rose-400 font-medium mt-2 bg-rose-500/10 py-1 px-3 rounded-full inline-block">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Account Card (Matching Video: Cosmic gradient circle + "Wallet 02" + "$478.00 Available" + "Wallets" button) */}
          <div className="mb-4">
            <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                {/* Artwork Thumbnail (Cosmic mountain landscape gradient circle matching video) */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-purple-700 via-indigo-600 to-sky-400 p-[1px] shrink-0 shadow-sm flex items-center justify-center relative">
                  <div className="w-full h-full rounded-full bg-cover bg-center bg-[#181028] flex items-center justify-center">
                    {/* Artistic gradient mesh mimicking the video thumbnail */}
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
                className="bg-[#222226] hover:bg-[#2c2c32] active:scale-95 text-xs font-semibold text-white px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-sm"
              >
                Wallets
              </button>
            </div>
          </div>

          {/* Clean Minimalist Keypad (Matching exact layout: 1-9, ., 0, backspace) */}
          <div className="w-full max-w-[280px] mx-auto mb-5">
            <div className="grid grid-cols-3 gap-y-4 gap-x-8 text-center">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  className="h-12 text-2xl font-normal text-white hover:text-white/80 active:scale-90 transition-transform flex items-center justify-center cursor-pointer select-none"
                >
                  {digit}
                </button>
              ))}

              {/* Row 4: . , 0 , Backspace */}
              <button
                type="button"
                onClick={() => handleDigit(".")}
                className="h-12 text-2xl font-normal text-white hover:text-white/80 active:scale-90 transition-transform flex items-center justify-center cursor-pointer select-none"
              >
                .
              </button>
              <button
                type="button"
                onClick={() => handleDigit("0")}
                className="h-12 text-2xl font-normal text-white hover:text-white/80 active:scale-90 transition-transform flex items-center justify-center cursor-pointer select-none"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-12 text-white hover:text-white/80 active:scale-90 transition-transform flex items-center justify-center cursor-pointer select-none"
              >
                <Delete className="h-5 w-5 stroke-[1.8]" />
              </button>
            </div>
          </div>

          {/* Bottom Action Button: "Continue" (Matching video's white rounded-full pill) */}
          <div className="pt-1 pb-1">
            <button
              type="button"
              onClick={handleContinue}
              disabled={animStage !== "idle" || parsedAmount <= 0}
              className="w-full py-4 rounded-full font-semibold text-sm sm:text-base bg-white text-black hover:bg-neutral-100 active:scale-[0.98] transition-all shadow-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
            >
              Continue
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
              className="absolute inset-0 z-50 bg-black/75 backdrop-blur-2xl flex flex-col items-center justify-center overflow-hidden"
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

              {/* Center Status Feedback: Ring Spinner / Checkmark + Text */}
              <div className="relative z-10 flex items-center justify-center gap-2.5">
                <AnimatePresence mode="wait">
                  {animStage === "topping_up" ? (
                    <motion.div
                      key="topping-up-content"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2.5"
                    >
                      {/* Hollow Ring Spinner (Exact match to video frame 4 & 7) */}
                      <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin" />
                      <span className="text-white text-xs sm:text-sm font-medium tracking-tight">
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
                      className="flex items-center gap-2.5"
                    >
                      {/* Solid White Circle with Dark Checkmark (Exact match to video frame 11) */}
                      <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                        <Check className="w-2.5 h-2.5 text-black stroke-[3.5]" />
                      </div>
                      <span className="text-white text-xs sm:text-sm font-medium tracking-tight">
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
              className="absolute inset-0 z-40 bg-[#0C0C0E] p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <h3 className="text-base font-bold text-white">Select Wallet</h3>
                  <button
                    type="button"
                    onClick={() => setIsAccountPickerOpen(false)}
                    className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-2 mt-4 max-h-[460px] overflow-y-auto">
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
                          ? "bg-[#1E1E24] text-white border-white/30 shadow-md font-bold"
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
        {/* 5. MODAL OVERLAY: Category Picker Modal                                    */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isCategoryPickerOpen && (
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="absolute inset-0 z-40 bg-[#0C0C0E] p-6 flex flex-col justify-between"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-base font-bold text-white">Select Category</h3>
                  <button
                    type="button"
                    onClick={() => setIsCategoryPickerOpen(false)}
                    className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
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
                      className={`p-3 rounded-2xl flex items-center gap-2 text-left transition-all border cursor-pointer ${
                        selectedCategory === catName
                          ? "bg-[#25252E] text-white border-white/30 font-bold"
                          : "bg-[#141418] hover:bg-[#1A1A22] text-neutral-300 border-white/5 font-medium"
                      }`}
                    >
                      <Tag className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
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
