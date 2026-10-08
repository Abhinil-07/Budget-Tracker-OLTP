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
          icon: <CreditCard className="h-5 w-5 text-rose-400" />,
          bg: "bg-[#181820] border-white/10",
          tag: "Credit Card",
          tagColor: "text-rose-400 bg-rose-500/10 border border-rose-500/20",
        };
      case "current":
        return {
          icon: <Landmark className="h-5 w-5 text-indigo-400" />,
          bg: "bg-[#181820] border-white/10",
          tag: "Current",
          tagColor: "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20",
        };
      default:
        return {
          icon: <Wallet className="h-5 w-5 text-emerald-400" />,
          bg: "bg-[#181820] border-white/10",
          tag: "Savings",
          tagColor: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
        };
    }
  };

  const badge = getBadgeStyle();

  return (
    <div
      onClick={onClick}
      className={`p-6 rounded-[26px] border transition-all duration-300 flex flex-col justify-between min-h-[190px] cursor-pointer group hover:scale-[1.01] shadow-xl relative overflow-hidden select-none ${
        isSelected
          ? "border-white ring-1 ring-white/30 bg-[#16161D]"
          : "bg-[#121216] border-white/[0.08] hover:border-white/20 hover:bg-[#16161B]"
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
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white text-black px-2.5 py-0.5 rounded-full shadow-sm">
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
              ? "text-rose-400"
              : account.balance_cents >= 0
              ? "text-white"
              : "text-rose-400"
          }`}
        >
          {formatCurrency(account.balance_cents, account.currency)}
        </div>
      </div>

      {/* Bottom Spend Inset Pill */}
      <div className="bg-[#18181E] border border-white/[0.06] rounded-2xl px-3.5 py-2.5 flex items-center justify-between text-xs mt-auto">
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
