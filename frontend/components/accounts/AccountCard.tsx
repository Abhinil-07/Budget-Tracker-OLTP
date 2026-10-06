"use client";

import React from "react";
import { Account } from "../../types/account";
import { formatCurrency } from "../../lib/formatCurrency";
import { Landmark, CreditCard, Wallet } from "lucide-react";

interface AccountCardProps {
  account: Account;
  spentThisMonthCents?: number;
  onClick?: () => void;
  isSelected?: boolean;
}

export default function AccountCard({
  account,
  spentThisMonthCents = 0,
  onClick,
  isSelected,
}: AccountCardProps) {
  const isCreditCard = account.type === "credit_card";

  // Select icon and custom pill styling matching reference
  const getBadgeStyle = () => {
    switch (account.type) {
      case "credit_card":
        return {
          icon: <CreditCard className="h-5 w-5 text-[#FFA494]" />,
          bg: "bg-[#FDECE8]/10 border-[#FDECE8]/20",
          tag: "Credit Card",
          tagColor: "text-[#FFA494] bg-[#FDECE8]/10",
        };
      case "current":
        return {
          icon: <Landmark className="h-5 w-5 text-[#C4B5FD]" />,
          bg: "bg-[#ECEBFB]/10 border-[#ECEBFB]/20",
          tag: "Current",
          tagColor: "text-[#C4B5FD] bg-[#ECEBFB]/10",
        };
      default:
        return {
          icon: <Wallet className="h-5 w-5 text-[#6EE7B7]" />,
          bg: "bg-[#D4EFE6]/10 border-[#D4EFE6]/20",
          tag: "Savings",
          tagColor: "text-[#6EE7B7] bg-[#D4EFE6]/10",
        };
    }
  };

  const badge = getBadgeStyle();

  return (
    <div
      onClick={onClick}
      className={`p-6 rounded-[26px] border transition-all duration-300 flex flex-col justify-between min-h-[190px] cursor-pointer group hover:scale-[1.01] shadow-xl relative overflow-hidden select-none ${
        isSelected
          ? "border-white/80 ring-2 ring-white/20 bg-[#181922]"
          : "bg-[#13141B] border-white/[0.07] hover:border-white/25 hover:bg-[#161720]"
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-full border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${badge.bg}`}
          >
            {badge.icon}
          </div>
          <div>
            <h4 className="font-bold text-white text-base tracking-tight group-hover:text-white transition-colors">
              {account.name}
            </h4>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 ${badge.tagColor}`}
            >
              {badge.tag}
            </span>
          </div>
        </div>

        {isSelected && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white text-black px-2.5 py-0.5 rounded-full">
            Active
          </span>
        )}
      </div>

      {/* Balance Row */}
      <div className="my-3">
        <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1">
          {isCreditCard ? "Amount Owed (Debt)" : "Available Balance"}
        </div>
        <div
          className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-sans ${
            isCreditCard
              ? "text-[#FF8470]"
              : account.balance_cents >= 0
              ? "text-white"
              : "text-[#FF8470]"
          }`}
        >
          {formatCurrency(account.balance_cents, account.currency)}
        </div>
      </div>

      {/* Bottom Spend Inset Pill */}
      <div className="bg-[#1A1B24] border border-white/[0.05] rounded-2xl px-3.5 py-2.5 flex items-center justify-between text-xs mt-auto">
        <div className="flex flex-col">
          <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">
            Spent This Month
          </span>
          <span className="font-bold text-white tracking-tight text-sm">
            {formatCurrency(spentThisMonthCents, account.currency)}
          </span>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-[10px] text-neutral-500 font-mono">
            {account.account_number ? `•••• ${account.account_number.slice(-4)}` : "No Num"}
          </span>
          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
            {account.currency}
          </span>
        </div>
      </div>
    </div>
  );
}
