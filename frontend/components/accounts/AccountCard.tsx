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

  // Select icon
  const getIcon = () => {
    switch (account.type) {
      case "credit_card":
        return <CreditCard className="h-5 w-5 text-danger" />;
      case "current":
        return <Landmark className="h-5 w-5 text-accent" />;
      default:
        return <Wallet className="h-5 w-5 text-success" />;
    }
  };

  // Select type label
  const getTypeLabel = () => {
    switch (account.type) {
      case "credit_card":
        return "Credit Card";
      case "current":
        return "Current Account";
      default:
        return "Savings Account";
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-surface p-5 rounded-xl border transition-all duration-200 flex flex-col justify-between min-h-[160px] cursor-pointer group hover:scale-[1.01] ${
        isSelected
          ? "border-accent ring-1 ring-accent bg-surface-raised"
          : "border-border hover:border-accent/40"
      }`}
    >
      {/* Top row */}
      <div className="flex items-center justify-between text-text-secondary text-sm">
        <span className="font-semibold text-text-primary group-hover:text-accent transition-colors duration-150">
          {account.name}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-surface-raised px-2 py-0.5 rounded border border-border text-text-muted">
            {getTypeLabel()}
          </span>
          {getIcon()}
        </div>
      </div>

      {/* Middle row: Live Balance & Spent Amount */}
      <div className="my-3 flex items-end justify-between gap-3">
        <div>
          <div
            className={`text-[10px] uppercase tracking-wider font-semibold mb-0.5 ${
              isCreditCard ? "text-danger" : "text-text-muted"
            }`}
          >
            {isCreditCard ? "Owed (Debt)" : "Balance"}
          </div>
          <div
            className={`font-mono text-2xl font-bold tracking-tight transition-all duration-300 ${
              isCreditCard
                ? "text-danger"
                : account.balance_cents >= 0
                ? "text-success"
                : "text-danger"
            }`}
          >
            {formatCurrency(account.balance_cents, account.currency)}
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-0.5">
            Spent Period
          </span>
          <span className="font-mono text-sm font-bold text-text-primary bg-surface-raised px-2.5 py-1 rounded border border-border/80">
            {formatCurrency(spentThisMonthCents, account.currency)}
          </span>
        </div>
      </div>

      {/* Bottom row: account number and/or status */}
      <div className="text-xs text-text-muted font-mono flex items-center justify-between mt-auto pt-2 border-t border-border/40">
        <span>
          {account.account_number ? `**** ${account.account_number.slice(-4)}` : "No Acc Number"}
        </span>
        <span className="text-[10px] text-text-secondary uppercase tracking-widest">
          {account.currency}
        </span>
      </div>
    </div>
  );
}
