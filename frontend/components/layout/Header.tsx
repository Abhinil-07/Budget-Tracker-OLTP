"use client";

import React, { useState } from "react";
import { Plus, Inbox } from "lucide-react";
import SyncStatusBadge from "../sync/SyncStatusBadge";
import StagedInboxModal from "../transactions/StagedInboxModal";
import { useStagedTransactions } from "@/hooks/useStagedTransactions";

interface HeaderProps {
  title?: string;
  onAddTransactionClick?: () => void;
  actionLabel?: string;
  onMenuClick?: () => void;
  hasSubNav?: boolean;
}

export default function Header({
  title = "Life OS",
  onAddTransactionClick,
  actionLabel,
  onMenuClick,
  hasSubNav = false,
}: HeaderProps) {
  const { stagedCount } = useStagedTransactions();
  const [showStagedInbox, setShowStagedInbox] = useState(false);

  return (
    <header className="h-14 border-b border-white/[0.08] bg-[#0A0A0E]/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 select-none">
      <StagedInboxModal isOpen={showStagedInbox} onClose={() => setShowStagedInbox(false)} />

      {/* Title */}
      <div className="flex items-center gap-2.5">
        <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
          {title}
        </h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Staged Inbox Badge (Finance) */}
        <button
          type="button"
          onClick={() => setShowStagedInbox(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer active:scale-95 border ${
            stagedCount > 0
              ? "bg-white/10 text-white border-white/20 hover:bg-white/15 shadow-sm"
              : "bg-white/[0.04] text-neutral-400 border-white/[0.08] hover:text-white hover:bg-white/[0.08]"
          }`}
          title="Staged Transactions"
        >
          <Inbox className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Inbox</span>
          {stagedCount > 0 && (
            <span className="px-1.5 py-0.5 bg-white text-black rounded-full text-[10px] font-bold leading-none">
              {stagedCount}
            </span>
          )}
        </button>

        {/* Sync Status Badge */}
        <SyncStatusBadge />

        {/* Primary Action Button */}
        {onAddTransactionClick && (
          <button
            onClick={onAddTransactionClick}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white hover:bg-neutral-100 text-black rounded-full text-xs font-bold transition-all shadow-lg shadow-white/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>{actionLabel || "Log Entry"}</span>
          </button>
        )}
      </div>
    </header>
  );
}
