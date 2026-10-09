"use client";

import React, { useState, useEffect, useRef } from "react";
import { Account } from "../../types/account";
import { formatCurrency } from "../../lib/formatCurrency";
import { useAccountTheme } from "../../lib/cardThemes";
import { Snowflake, Settings, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AccountCardProps {
  account: Account;
  spentThisMonthCents?: number;
  onClick?: () => void;
  onEdit?: () => void;
  isSelected?: boolean;
  colorIndex?: number;
  animateBalance?: boolean;
}

export default function AccountCard({
  account,
  spentThisMonthCents = 0,
  onClick,
  onEdit,
  isSelected,
  colorIndex = 0,
  animateBalance = true,
}: AccountCardProps) {
  const isCreditCard = account.type === "credit_card";
  const [isMasked, setIsMasked] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);

  // Animated rolling counter for balance adjustment
  const [displayBalanceCents, setDisplayBalanceCents] = useState(animateBalance ? 0 : account.balance_cents);
  const [displaySpentCents, setDisplaySpentCents] = useState(animateBalance ? 0 : spentThisMonthCents);
  const [isRolling, setIsRolling] = useState(animateBalance);
  const prevAccountIdRef = useRef(account.id);
  const prevBalanceRef = useRef(0);

  useEffect(() => {
    if (!animateBalance) {
      setDisplayBalanceCents(account.balance_cents);
      setDisplaySpentCents(spentThisMonthCents);
      setIsRolling(false);
      return;
    }

    const isNewCard = prevAccountIdRef.current !== account.id;
    prevAccountIdRef.current = account.id;

    const startVal = isNewCard ? 0 : prevBalanceRef.current;
    const targetVal = account.balance_cents;
    prevBalanceRef.current = targetVal;

    let startTimestamp: number | null = null;
    let animId: number;
    const duration = 750; // Smooth 750ms roll matching the video
    setIsRolling(true);

    const step = (now: number) => {
      if (!startTimestamp) startTimestamp = now;
      const elapsed = now - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (targetVal - startVal) * ease);
      setDisplayBalanceCents(current);
      setDisplaySpentCents(Math.round(spentThisMonthCents * ease));

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayBalanceCents(targetVal);
        setDisplaySpentCents(spentThisMonthCents);
        setIsRolling(false);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [account.id, account.balance_cents, spentThisMonthCents, animateBalance]);

  // Dynamic card theme selection (supports user custom choice, saved theme, or fallback)
  const [theme] = useAccountTheme(account, colorIndex);
  const typeBadge = isCreditCard ? "Credit Card" : "Digital Card";
  const statusText = isCreditCard ? "Liability / Debt" : "Active";

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      onClick={onClick}
      style={{
        backgroundImage: theme.ambientGlow,
      }}
      className={`relative rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 min-h-[200px] sm:min-h-[220px] cursor-pointer flex flex-col justify-between overflow-hidden select-none transition-all duration-300 ${
        theme.cardBg
      } ${theme.glowShadow} ${
        isSelected ? "ring-2 ring-white/60 shadow-2xl" : ""
      } ${isFrozen ? "ring-2 ring-sky-400/80 shadow-[0_0_30px_rgba(56,189,248,0.25)]" : ""}`}
    >
      {/* Luminous Atmospheric Corner Glow */}
      <div
        className="absolute -top-8 -right-8 w-36 h-36 rounded-full pointer-events-none blur-2xl opacity-25 transition-opacity"
        style={{ background: theme.spotlightColor }}
      />
      <div
        className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full pointer-events-none blur-2xl opacity-20 transition-opacity"
        style={{ background: theme.spotlightColor }}
      />

      {/* Frozen Card Frosted Overlay */}
      <AnimatePresence>
        {isFrozen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-sky-950/40 backdrop-blur-[2px] z-20 pointer-events-none flex items-center justify-center"
          >
            <div className="bg-sky-500/20 px-3.5 py-1 rounded-full text-[11px] font-bold text-sky-200 tracking-wider flex items-center gap-1.5 shadow-lg">
              <Snowflake className="h-3.5 w-3.5 animate-spin" />
              <span>CARD FROZEN</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Row */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm sm:text-base font-bold text-white tracking-tight">
            {account.name}
          </span>
          <span
            className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${theme.accentPill}`}
          >
            {typeBadge}
          </span>
        </div>

        <div className="text-xs font-mono font-bold tracking-widest text-white/60">
          •••• {account.account_number ? account.account_number.slice(-4) : "7642"}
        </div>
      </div>

      {/* Middle: Large Balance */}
      <div className="my-3 sm:my-4 relative z-10 overflow-hidden">
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-white/70 block mb-1">
          {isCreditCard ? "Amount Owed (Debt)" : "Available Balance"}
        </span>
        <motion.div
          key={`${account.id}-${isMasked}`}
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 340, damping: 24 }}
          className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans text-white flex items-center gap-2.5 flex-wrap"
        >
          <span>
            {isMasked ? "••••••••" : formatCurrency(displayBalanceCents, account.currency)}
          </span>
          {!isMasked && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={isRolling ? { scale: 0.95, opacity: 0.8 } : { scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-md text-white/80 shadow-sm transition-colors duration-200"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${
                    isRolling ? "bg-sky-300" : "bg-white"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                    isRolling ? "bg-sky-400" : "bg-white/70"
                  }`}
                />
              </span>
              <span>{isRolling ? "Adjusting" : "Live"}</span>
            </motion.span>
          )}
        </motion.div>
        <motion.span
          key={`spent-${account.id}`}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="text-[11px] text-white/75 font-medium block mt-1"
        >
          Spent this month: {formatCurrency(displaySpentCents, account.currency)}
        </motion.span>
      </div>

      {/* Bottom Row: 3 Functional Frosted Buttons + Subtle Card Watermark */}
      <div className="flex items-center justify-between mt-auto pt-2 relative z-10">
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Action 1: Toggle Mask / Privacy (Eye button) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMasked(!isMasked);
            }}
            title={isMasked ? "Reveal balance" : "Hide balance"}
            className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 cursor-pointer ${
              isMasked ? "bg-white/20 text-white" : theme.btnPill
            }`}
          >
            {isMasked ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>

          {/* Action 2: Freeze / Snowflake icon (Working Toggle) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsFrozen(!isFrozen);
            }}
            title={isFrozen ? "Unfreeze card" : "Freeze card"}
            className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 cursor-pointer ${
              isFrozen
                ? "bg-sky-500/30 text-sky-300 ring-2 ring-sky-400/30"
                : theme.btnPill
            }`}
          >
            <Snowflake className={`h-4 w-4 ${isFrozen ? "text-sky-300 animate-pulse" : ""}`} />
          </button>

          {/* Action 3: Details & Settings */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit();
              else if (onClick) onClick();
            }}
            title="Card settings and edit"
            className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 cursor-pointer ${theme.btnPill}`}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {/* Dual Circle Card Watermark */}
        <div className="flex items-center opacity-30">
          <div className="w-5 h-5 rounded-full bg-white/40 -mr-1.5" />
          <div className="w-5 h-5 rounded-full bg-white/20" />
        </div>
      </div>
    </motion.div>
  );
}
