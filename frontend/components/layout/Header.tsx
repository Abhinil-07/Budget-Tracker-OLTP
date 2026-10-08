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
    <header className="h-14 border-b border-border bg-surface/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <StagedInboxModal isOpen={showStagedInbox} onClose={() => setShowStagedInbox(false)} />

      {/* Title */}
      <div className="flex items-center gap-2.5">
        <h1 className="text-sm sm:text-base font-semibold text-text-primary tracking-tight">
          {title}
        </h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Staged Inbox Badge (Finance) */}
        <button
          type="button"
          onClick={() => setShowStagedInbox(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            stagedCount > 0
              ? "bg-accent/10 text-accent border-accent/30 hover:bg-accent/15"
              : "bg-surface-raised text-text-muted border-border hover:text-text-secondary"
          }`}
          title="Staged Transactions"
        >
          <Inbox className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Inbox</span>
          {stagedCount > 0 && (
            <span className="px-1.5 py-0.5 bg-accent text-white rounded-full text-[10px] font-bold leading-none">
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 text-black rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>{actionLabel || "Log Entry"}</span>
          </button>
        )}
      </div>
    </header>
  );
}
