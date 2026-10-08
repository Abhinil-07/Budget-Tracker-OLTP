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

  // Vivid halo vignette gradients matching Frame 2 of the Smart Ring reference (media_1791486379228_182d0c65.png)
  const getCardTheme = () => {
    if (isCreditCard) {
      return {
        // Velvet Wine / Deep Crimson
        cardBg: "bg-[#290C16]",
        ambientGlow: "radial-gradient(115% 115% at 50% 50%, #200911 15%, #7D2138 72%, #9B2D49 100%)",
        borderColor: "border-[#9B2D49]/45 hover:border-[#9B2D49]/75",
        accentPill: "bg-[#9B2D49]/30 border-[#9B2D49]/45 text-rose-100",
        btnPill: "bg-black/25 hover:bg-black/40 text-white/90 hover:text-white border-white/10",
        glowShadow: "shadow-[0_16px_36px_-6px_rgba(125,33,56,0.45)]",
        typeBadge: "Credit Card",
        statusText: "Liability / Debt",
      };
    }

    const themes = [
      {
        // 1. Heart Rate: Sage / Pine Teal Smoke (Top-Left in reference)
        cardBg: "bg-[#11231F]",
        ambientGlow: "radial-gradient(115% 115% at 50% 50%, #0E1D19 15%, #385E56 72%, #48786E 100%)",
        borderColor: "border-[#48786E]/45 hover:border-[#48786E]/75",
        accentPill: "bg-[#48786E]/30 border-[#48786E]/45 text-emerald-100",
        btnPill: "bg-black/25 hover:bg-black/40 text-white/90 hover:text-white border-white/10",
        glowShadow: "shadow-[0_16px_36px_-6px_rgba(56,94,86,0.45)]",
        typeBadge: "Digital Card",
        statusText: "Active",
      },
      {
        // 2. Glucose: Rich Velvet Orchid / Magenta-Plum (Top-Right in reference)
        cardBg: "bg-[#2B1224]",
        ambientGlow: "radial-gradient(115% 115% at 50% 50%, #220D1C 15%, #7A325C 72%, #964173 100%)",
        borderColor: "border-[#964173]/45 hover:border-[#964173]/75",
        accentPill: "bg-[#964173]/30 border-[#964173]/45 text-pink-100",
        btnPill: "bg-black/25 hover:bg-black/40 text-white/90 hover:text-white border-white/10",
        glowShadow: "shadow-[0_16px_36px_-6px_rgba(122,50,92,0.45)]",
        typeBadge: "Digital Card",
        statusText: "Active",
      },
      {
        // 3. Temperature: Royal Slate Cobalt / Sapphire (Bottom-Left in reference)
        cardBg: "bg-[#0E1B38]",
        ambientGlow: "radial-gradient(115% 115% at 50% 50%, #0A142A 15%, #234986 72%, #325FA6 100%)",
        borderColor: "border-[#325FA6]/45 hover:border-[#325FA6]/75",
        accentPill: "bg-[#325FA6]/30 border-[#325FA6]/45 text-sky-100",
        btnPill: "bg-black/25 hover:bg-black/40 text-white/90 hover:text-white border-white/10",
        glowShadow: "shadow-[0_16px_36px_-6px_rgba(35,73,134,0.45)]",
        typeBadge: "Digital Card",
        statusText: "Active",
      },
      {
        // 4. Steps: Warm Burnt Terracotta / Rust Copper (Bottom-Right in reference)
        cardBg: "bg-[#29130B]",
        ambientGlow: "radial-gradient(115% 115% at 50% 50%, #210E07 15%, #843B27 72%, #A24B34 100%)",
        borderColor: "border-[#A24B34]/45 hover:border-[#A24B34]/75",
        accentPill: "bg-[#A24B34]/30 border-[#A24B34]/45 text-amber-100",
        btnPill: "bg-black/25 hover:bg-black/40 text-white/90 hover:text-white border-white/10",
        glowShadow: "shadow-[0_16px_36px_-6px_rgba(132,59,39,0.45)]",
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
