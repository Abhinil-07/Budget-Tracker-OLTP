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

  // Exact 4 card themes matching the user screenshot (media_1791488183377_bb159f55.png)
  // Heart Rate (Sage Green), Temperature (Cobalt Blue), Glucose (Orchid Pink), Steps (Terracotta)
  const getCardTheme = () => {
    const typeBadge = isCreditCard ? "Credit Card" : "Digital Card";
    const statusText = isCreditCard ? "Liability / Debt" : "Active";

    const themes = [
      {
        // 1. Sage Green (Top-Left: Heart Rate)
        cardBg: "bg-[#060E0C]",
        ambientGlow: "radial-gradient(120% 120% at 50% 50%, #030605 0%, #081613 28%, #23473D 65%, #5B7F72 100%)",
        spotlightColor: "rgba(91, 127, 114, 0.45)",
        borderColor: "border-[#679182]/60 hover:border-[#83B7A5]/90",
        accentPill: "bg-[#23473D]/70 border-[#679182]/70 text-emerald-100 shadow-sm",
        btnPill: "bg-black/40 hover:bg-black/60 text-white/95 hover:text-white border-white/15",
        glowShadow: "shadow-[0_16px_36px_-6px_rgba(91,127,114,0.45)]",
        typeBadge,
        statusText,
      },
      {
        // 2. Royal Cobalt Blue (Bottom-Left: Temperature)
        cardBg: "bg-[#040816]",
        ambientGlow: "radial-gradient(120% 120% at 50% 50%, #02030B 0%, #050E24 28%, #163475 65%, #315CBA 100%)",
        spotlightColor: "rgba(49, 92, 186, 0.45)",
        borderColor: "border-[#4A7CE0]/60 hover:border-[#729FFF]/90",
        accentPill: "bg-[#163475]/70 border-[#4A7CE0]/70 text-sky-100 shadow-sm",
        btnPill: "bg-black/40 hover:bg-black/60 text-white/95 hover:text-white border-white/15",
        glowShadow: "shadow-[0_16px_36px_-6px_rgba(49,92,186,0.45)]",
        typeBadge,
        statusText,
      },
      {
        // 3. Orchid Pink / Magenta (Top-Right: Glucose)
        cardBg: "bg-[#1E0413]",
        ambientGlow: "radial-gradient(120% 120% at 50% 50%, #2A051A 0%, #4D0A32 28%, #8D2562 65%, #BE5B90 100%)",
        spotlightColor: "rgba(190, 91, 144, 0.45)",
        borderColor: "border-[#D1699F]/60 hover:border-[#F48BC3]/90",
        accentPill: "bg-[#8D2562]/70 border-[#D1699F]/70 text-pink-100 shadow-sm",
        btnPill: "bg-black/40 hover:bg-black/60 text-white/95 hover:text-white border-white/15",
        glowShadow: "shadow-[0_16px_36px_-6px_rgba(190,91,144,0.45)]",
        typeBadge,
        statusText,
      },
      {
        // 4. Warm Terracotta / Rust Copper (Bottom-Right: Steps)
        cardBg: "bg-[#180401]",
        ambientGlow: "radial-gradient(120% 120% at 50% 50%, #220602 0%, #3F0E04 28%, #7D2916 65%, #AA4A33 100%)",
        spotlightColor: "rgba(170, 74, 51, 0.45)",
        borderColor: "border-[#C7553A]/60 hover:border-[#EB7356]/90",
        accentPill: "bg-[#7D2916]/70 border-[#C7553A]/70 text-amber-100 shadow-sm",
        btnPill: "bg-black/40 hover:bg-black/60 text-white/95 hover:text-white border-white/15",
        glowShadow: "shadow-[0_16px_36px_-6px_rgba(170,74,51,0.45)]",
        typeBadge,
        statusText,
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
      {/* Luminous Atmospheric Corner Glow */}
      <div
        className="absolute -top-8 -right-8 w-36 h-36 rounded-full pointer-events-none blur-2xl opacity-40 transition-opacity"
        style={{ background: theme.spotlightColor }}
      />
      <div
        className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full pointer-events-none blur-2xl opacity-30 transition-opacity"
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
