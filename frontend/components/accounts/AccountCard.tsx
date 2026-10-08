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
        // 1. Muted Sage Green / Lichen Slate (Top-Left: Heart Rate)
        cardBg: "bg-[#080E0D]",
        ambientGlow: "radial-gradient(125% 125% at 50% 50%, #050808 0%, #0A1413 25%, #253330 65%, #51615F 100%)",
        spotlightColor: "rgba(81, 97, 95, 0.35)",
        borderColor: "border-[#51615F]/55 hover:border-[#6B7F7D]/85",
        accentPill: "bg-[#253330]/75 border-[#51615F]/60 text-[#D1DBD9] shadow-sm",
        btnPill: "bg-black/40 hover:bg-black/60 text-white/95 hover:text-white border-white/15",
        glowShadow: "shadow-[0_16px_36px_-8px_rgba(81,97,95,0.35)]",
        typeBadge,
        statusText,
      },
      {
        // 2. Muted Slate Cobalt Navy Blue (Bottom-Left: Temperature)
        cardBg: "bg-[#050914]",
        ambientGlow: "radial-gradient(125% 125% at 50% 50%, #03050C 0%, #060B1A 25%, #152244 65%, #273A71 100%)",
        spotlightColor: "rgba(39, 58, 113, 0.35)",
        borderColor: "border-[#273A71]/55 hover:border-[#38519B]/85",
        accentPill: "bg-[#152244]/75 border-[#273A71]/60 text-[#C7D4F0] shadow-sm",
        btnPill: "bg-black/40 hover:bg-black/60 text-white/95 hover:text-white border-white/15",
        glowShadow: "shadow-[0_16px_36px_-8px_rgba(39,58,113,0.35)]",
        typeBadge,
        statusText,
      },
      {
        // 3. Dusty Mauve Orchid / Muted Pink (Top-Right: Glucose)
        cardBg: "bg-[#14050E]",
        ambientGlow: "radial-gradient(125% 125% at 50% 50%, #180611 0%, #300C22 25%, #632448 65%, #A65C88 100%)",
        spotlightColor: "rgba(166, 92, 136, 0.35)",
        borderColor: "border-[#A65C88]/55 hover:border-[#C473A3]/85",
        accentPill: "bg-[#632448]/75 border-[#A65C88]/60 text-[#F5D8E8] shadow-sm",
        btnPill: "bg-black/40 hover:bg-black/60 text-white/95 hover:text-white border-white/15",
        glowShadow: "shadow-[0_16px_36px_-8px_rgba(166,92,136,0.35)]",
        typeBadge,
        statusText,
      },
      {
        // 4. Warm Earthy Clay Terracotta (Bottom-Right: Steps)
        cardBg: "bg-[#120402]",
        ambientGlow: "radial-gradient(125% 125% at 50% 50%, #180503 0%, #2E0D07 25%, #5D2318 65%, #944838 100%)",
        spotlightColor: "rgba(148, 72, 56, 0.35)",
        borderColor: "border-[#944838]/55 hover:border-[#B25A47]/85",
        accentPill: "bg-[#5D2318]/75 border-[#944838]/60 text-[#F6D9D2] shadow-sm",
        btnPill: "bg-black/40 hover:bg-black/60 text-white/95 hover:text-white border-white/15",
        glowShadow: "shadow-[0_16px_36px_-8px_rgba(148,72,56,0.35)]",
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
