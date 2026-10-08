"use client";

import React, { useState } from "react";
import { Account } from "../../types/account";
import { formatCurrency } from "../../lib/formatCurrency";
import { Snowflake, Settings, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AccountCardProps {
  account: Account;
  spentThisMonthCents?: number;
  onClick?: () => void;
  onEdit?: () => void;
  isSelected?: boolean;
  colorIndex?: number;
}

export default function AccountCard({
  account,
  spentThisMonthCents = 0,
  onClick,
  onEdit,
  isSelected,
  colorIndex = 0,
}: AccountCardProps) {
  const isCreditCard = account.type === "credit_card";
  const [isMasked, setIsMasked] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);

  // Deep ambient glow themes inspired by the smart ring UI (media_1791485962579_e0939bc1.png)
  const getCardTheme = () => {
    if (isCreditCard) {
      return {
        // Deep Rose / Velvet Crimson
        cardBg: "bg-[#140F13] border-rose-500/25 hover:border-rose-500/40",
        ambientGlow: "radial-gradient(circle at 85% 15%, rgba(244, 63, 94, 0.18) 0%, rgba(136, 19, 55, 0.08) 50%, transparent 80%)",
        accentPill: "bg-rose-500/15 border-rose-500/25 text-rose-300",
        btnPill: "bg-white/[0.06] hover:bg-white/[0.14] text-neutral-300 hover:text-white border-white/[0.08]",
        glowShadow: "shadow-[0_12px_32px_-8px_rgba(244,63,94,0.18)]",
        typeBadge: "Credit Card",
        statusText: "Liability / Debt",
      };
    }

    const themes = [
      {
        // 1. Deep Sage / Emerald Smoke (Card 1 in reference)
        cardBg: "bg-[#0F1412] border-emerald-500/25 hover:border-emerald-500/40",
        ambientGlow: "radial-gradient(circle at 85% 15%, rgba(16, 185, 129, 0.18) 0%, rgba(6, 78, 59, 0.08) 50%, transparent 80%)",
        accentPill: "bg-emerald-500/15 border-emerald-500/25 text-emerald-300",
        btnPill: "bg-white/[0.06] hover:bg-white/[0.14] text-neutral-300 hover:text-white border-white/[0.08]",
        glowShadow: "shadow-[0_12px_32px_-8px_rgba(16,185,129,0.18)]",
        typeBadge: "Digital Card",
        statusText: "Active",
      },
      {
        // 2. Velvet Plum / Dark Mauve (Card 2 in reference)
        cardBg: "bg-[#141018] border-purple-500/25 hover:border-purple-500/40",
        ambientGlow: "radial-gradient(circle at 85% 15%, rgba(168, 85, 247, 0.18) 0%, rgba(88, 28, 135, 0.08) 50%, transparent 80%)",
        accentPill: "bg-purple-500/15 border-purple-500/25 text-purple-300",
        btnPill: "bg-white/[0.06] hover:bg-white/[0.14] text-neutral-300 hover:text-white border-white/[0.08]",
        glowShadow: "shadow-[0_12px_32px_-8px_rgba(168,85,247,0.18)]",
        typeBadge: "Digital Card",
        statusText: "Active",
      },
      {
        // 3. Midnight Sapphire / Deep Ocean (Card 3 in reference)
        cardBg: "bg-[#0E131C] border-sky-500/25 hover:border-sky-500/40",
        ambientGlow: "radial-gradient(circle at 85% 15%, rgba(14, 165, 233, 0.18) 0%, rgba(3, 105, 161, 0.08) 50%, transparent 80%)",
        accentPill: "bg-sky-500/15 border-sky-500/25 text-sky-300",
        btnPill: "bg-white/[0.06] hover:bg-white/[0.14] text-neutral-300 hover:text-white border-white/[0.08]",
        glowShadow: "shadow-[0_12px_32px_-8px_rgba(14,165,233,0.18)]",
        typeBadge: "Digital Card",
        statusText: "Active",
      },
      {
        // 4. Amber Bronze / Terracotta (Card 4 in reference)
        cardBg: "bg-[#17130F] border-amber-500/25 hover:border-amber-500/40",
        ambientGlow: "radial-gradient(circle at 85% 15%, rgba(245, 158, 11, 0.18) 0%, rgba(120, 53, 15, 0.08) 50%, transparent 80%)",
        accentPill: "bg-amber-500/15 border-amber-500/25 text-amber-300",
        btnPill: "bg-white/[0.06] hover:bg-white/[0.14] text-neutral-300 hover:text-white border-white/[0.08]",
        glowShadow: "shadow-[0_12px_32px_-8px_rgba(245,158,11,0.18)]",
        typeBadge: "Digital Card",
        statusText: "Active",
      },
    ];

    return themes[colorIndex % themes.length];
  };

  const theme = getCardTheme();

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      onClick={onClick}
      style={{
        backgroundImage: theme.ambientGlow,
      }}
      className={`relative rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 min-h-[200px] sm:min-h-[220px] cursor-pointer flex flex-col justify-between overflow-hidden select-none border transition-all duration-300 ${
        theme.cardBg
      } ${theme.glowShadow} ${
        isSelected ? "ring-2 ring-white shadow-2xl" : ""
      } ${isFrozen ? "ring-2 ring-sky-400/80 shadow-[0_0_30px_rgba(56,189,248,0.25)]" : ""}`}
    >
      {/* Frozen Card Frosted Overlay */}
      <AnimatePresence>
        {isFrozen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-sky-950/40 backdrop-blur-[2px] z-20 pointer-events-none flex items-center justify-center"
          >
            <div className="bg-sky-500/20 border border-sky-400/40 px-3.5 py-1 rounded-full text-[11px] font-bold text-sky-200 tracking-wider flex items-center gap-1.5 shadow-lg">
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
            className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.accentPill}`}
          >
            {theme.typeBadge}
          </span>
        </div>

        <div className="text-xs font-mono font-bold tracking-widest text-neutral-400">
          •••• {account.account_number ? account.account_number.slice(-4) : "7642"}
        </div>
      </div>

      {/* Middle: Large Balance */}
      <div className="my-3 sm:my-4 relative z-10">
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
          {isCreditCard ? "Amount Owed (Debt)" : "Available Balance"}
        </span>
        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans text-white">
          {isMasked ? "••••••••" : formatCurrency(account.balance_cents, account.currency)}
        </div>
        <span className="text-[11px] text-neutral-400 font-medium block mt-1">
          Spent this month: {formatCurrency(spentThisMonthCents, account.currency)}
        </span>
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
            className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 border cursor-pointer ${
              isMasked ? "bg-white/20 text-white border-white/30" : theme.btnPill
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
            className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 border cursor-pointer ${
              isFrozen
                ? "bg-sky-500/30 text-sky-300 border-sky-400/50 ring-2 ring-sky-400/30"
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
            className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 border cursor-pointer ${theme.btnPill}`}
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
