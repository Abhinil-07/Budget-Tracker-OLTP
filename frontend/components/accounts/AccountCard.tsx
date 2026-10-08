"use client";

import React, { useState } from "react";
import { Account } from "../../types/account";
import { formatCurrency } from "../../lib/formatCurrency";
import { Snowflake, CreditCard, Settings, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

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

  // Gradient themes matching Reference Video Frame 2
  const getCardTheme = () => {
    if (isCreditCard) {
      return {
        bg: "bg-gradient-to-br from-[#C084FC] via-[#A855F7] to-[#6D28D9]",
        text: "text-white",
        subtext: "text-white/80",
        pillBg: "bg-white/20 hover:bg-white/30 text-white",
        shadow: "shadow-[0_22px_40px_-10px_rgba(168,85,247,0.38)]",
        cardType: "Credit Card",
      };
    }

    const themes = [
      {
        // Lemon / Lime (Card 1 in video)
        bg: "bg-gradient-to-br from-[#F4FE52] via-[#E4FB28] to-[#BEE60A]",
        text: "text-[#111317]",
        subtext: "text-black/75",
        pillBg: "bg-black/15 hover:bg-black/25 text-black",
        shadow: "shadow-[0_22px_40px_-10px_rgba(215,245,30,0.38)]",
        cardType: "Digital Card",
      },
      {
        // Mint / Emerald (Card 2 in video)
        bg: "bg-gradient-to-br from-[#29EAAF] via-[#10DE9F] to-[#04BA88]",
        text: "text-[#111317]",
        subtext: "text-black/75",
        pillBg: "bg-black/15 hover:bg-black/25 text-black",
        shadow: "shadow-[0_22px_40px_-10px_rgba(16,222,159,0.38)]",
        cardType: "Digital Card",
      },
      {
        // Sky Blue / Cyan (Card 3 in video)
        bg: "bg-gradient-to-br from-[#38BDF8] via-[#0EA5E9] to-[#0284C7]",
        text: "text-white",
        subtext: "text-white/80",
        pillBg: "bg-white/20 hover:bg-white/30 text-white",
        shadow: "shadow-[0_22px_40px_-10px_rgba(14,165,233,0.38)]",
        cardType: "Digital Card",
      },
    ];

    return themes[colorIndex % themes.length];
  };

  const theme = getCardTheme();

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      onClick={onClick}
      className={`relative rounded-[32px] p-6 sm:p-7 min-h-[220px] cursor-pointer flex flex-col justify-between overflow-hidden select-none transition-all duration-300 ${theme.bg} ${theme.text} ${theme.shadow} ${
        isSelected ? "ring-4 ring-white shadow-2xl" : ""
      }`}
    >
      {/* Subtle organic watermark wave */}
      <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 pointer-events-none blur-xl" />

      {/* Top Header Row */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-tight">
            {account.name}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${theme.pillBg}`}>
            {theme.cardType}
          </span>
        </div>

        <div className="text-xs font-mono font-bold tracking-widest opacity-85">
          •••• {account.account_number ? account.account_number.slice(-4) : "7642"}
        </div>
      </div>

      {/* Middle: Large Balance */}
      <div className="my-3 relative z-10">
        <span className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${theme.subtext}`}>
          {isCreditCard ? "Amount Owed (Debt)" : "Available Balance"}
        </span>
        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans">
          {isMasked ? "••••••••" : formatCurrency(account.balance_cents, account.currency)}
        </div>
        <span className={`text-[11px] font-semibold block mt-1 ${theme.subtext}`}>
          Spent this month: {formatCurrency(spentThisMonthCents, account.currency)}
        </span>
      </div>

      {/* Bottom Row: 3 Frosted Buttons (Matching Reference Video Frame 2) + Watermark Logo */}
      <div className="flex items-center justify-between mt-auto pt-2 relative z-10">
        <div className="flex items-center gap-2.5">
          {/* Action 1: Toggle Mask / Privacy */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMasked(!isMasked);
            }}
            title="Hide / Reveal Balance"
            className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 ${theme.pillBg}`}
          >
            {isMasked ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>

          {/* Action 2: Freeze / Snowflake icon */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
            }}
            title="Card Security"
            className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 ${theme.pillBg}`}
          >
            <Snowflake className="h-4 w-4" />
          </button>

          {/* Action 3: Details & Settings */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit();
              else if (onClick) onClick();
            }}
            title="Card Settings"
            className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 ${theme.pillBg}`}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {/* Dual Circle Card Watermark (Matching Frame 2) */}
        <div className="flex items-center opacity-60">
          <div className="w-6 h-6 rounded-full bg-white/40 -mr-2" />
          <div className="w-6 h-6 rounded-full bg-white/25" />
        </div>
      </div>
    </motion.div>
  );
}
