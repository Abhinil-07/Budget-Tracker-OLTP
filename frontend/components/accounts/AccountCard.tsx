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

  // Vivid halo vignette gradients matching Frame 2 of the reference (media_1791486379228_182d0c65.png)
  const getCardTheme = () => {
    if (isCreditCard) {
      return {
        // Velvet Wine / Deep Crimson
        cardBg: "bg-[#2A0A16]",
        ambientGlow: "radial-gradient(135% 135% at 50% 20%, #7D1A35 0%, #480F1E 55%, #1F050C 100%)",
        spotlightColor: "rgba(225, 45, 90, 0.45)",
        borderColor: "border-[#B83256]/60 hover:border-[#E12D5A]/90",
        accentPill: "bg-[#7D1A35]/60 border-[#B83256]/70 text-rose-100 shadow-sm",
        btnPill: "bg-black/35 hover:bg-black/60 text-white/95 hover:text-white border-white/15",
        glowShadow: "shadow-[0_18px_40px_-8px_rgba(180,30,70,0.5)]",
        typeBadge: "Credit Card",
        statusText: "Liability / Debt",
      };
    }

    const themes = [
      {
        // 1. Sage / Emerald Green Tint (Frame 2 Heart Rate)
        cardBg: "bg-[#0F2922]",
        ambientGlow: "radial-gradient(135% 135% at 50% 20%, #2A6856 0%, #164034 55%, #0B221B 100%)",
        spotlightColor: "rgba(45, 175, 135, 0.5)",
        borderColor: "border-[#3EA588]/60 hover:border-[#52C9A7]/90",
        accentPill: "bg-[#2A6856]/60 border-[#3EA588]/70 text-emerald-100 shadow-sm",
        btnPill: "bg-black/35 hover:bg-black/60 text-white/95 hover:text-white border-white/15",
        glowShadow: "shadow-[0_18px_40px_-8px_rgba(42,120,95,0.5)]",
        typeBadge: "Digital Card",
        statusText: "Active",
      },
      {
        // 2. Royal Sapphire / Cobalt Blue Tint (Frame 2 Temperature)
        cardBg: "bg-[#102044]",
        ambientGlow: "radial-gradient(135% 135% at 50% 20%, #2956A3 0%, #17346A 55%, #0A1938 100%)",
        spotlightColor: "rgba(56, 130, 246, 0.5)",
        borderColor: "border-[#437EDD]/60 hover:border-[#60A5FA]/90",
        accentPill: "bg-[#2956A3]/60 border-[#437EDD]/70 text-sky-100 shadow-sm",
        btnPill: "bg-black/35 hover:bg-black/60 text-white/95 hover:text-white border-white/15",
        glowShadow: "shadow-[0_18px_40px_-8px_rgba(41,86,163,0.5)]",
        typeBadge: "Digital Card",
        statusText: "Active",
      },
      {
        // 3. Rich Velvet Orchid / Magenta Tint (Frame 2 Glucose)
        cardBg: "bg-[#33122D]",
        ambientGlow: "radial-gradient(135% 135% at 50% 20%, #852C65 0%, #4D183B 55%, #23081A 100%)",
        spotlightColor: "rgba(215, 60, 160, 0.5)",
        borderColor: "border-[#BD4492]/60 hover:border-[#F472B6]/90",
        accentPill: "bg-[#852C65]/60 border-[#BD4492]/70 text-pink-100 shadow-sm",
        btnPill: "bg-black/35 hover:bg-black/60 text-white/95 hover:text-white border-white/15",
        glowShadow: "shadow-[0_18px_40px_-8px_rgba(145,45,110,0.5)]",
        typeBadge: "Digital Card",
        statusText: "Active",
      },
      {
        // 4. Burnt Terracotta / Rust Copper Tint (Frame 2 Steps)
        cardBg: "bg-[#36160E]",
        ambientGlow: "radial-gradient(135% 135% at 50% 20%, #8A3723 0%, #521E12 55%, #250B06 100%)",
        spotlightColor: "rgba(235, 95, 60, 0.5)",
        borderColor: "border-[#C55337]/60 hover:border-[#FB923C]/90",
        accentPill: "bg-[#8A3723]/60 border-[#C55337]/70 text-amber-100 shadow-sm",
        btnPill: "bg-black/35 hover:bg-black/60 text-white/95 hover:text-white border-white/15",
        glowShadow: "shadow-[0_18px_40px_-8px_rgba(150,55,30,0.5)]",
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
      } ${theme.borderColor} ${theme.glowShadow} ${
        isSelected ? "ring-2 ring-white shadow-2xl" : ""
      } ${isFrozen ? "ring-2 ring-sky-400/80 shadow-[0_0_30px_rgba(56,189,248,0.25)]" : ""}`}
    >
      {/* Luminous Inner Ambient Halo Lighting */}
      <div
        className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none blur-3xl opacity-75 transition-opacity"
        style={{ background: theme.spotlightColor }}
      />
      <div
        className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full pointer-events-none blur-2xl opacity-45 transition-opacity"
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

        <div className="text-xs font-mono font-bold tracking-widest text-white/60">
          •••• {account.account_number ? account.account_number.slice(-4) : "7642"}
        </div>
      </div>

      {/* Middle: Large Balance */}
      <div className="my-3 sm:my-4 relative z-10">
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-white/70 block mb-1">
          {isCreditCard ? "Amount Owed (Debt)" : "Available Balance"}
        </span>
        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans text-white">
          {isMasked ? "••••••••" : formatCurrency(account.balance_cents, account.currency)}
        </div>
        <span className="text-[11px] text-white/75 font-medium block mt-1">
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
