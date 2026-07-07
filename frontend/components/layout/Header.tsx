import React from "react";
import { Plus, Menu } from "lucide-react";
import SyncStatusBadge from "../sync/SyncStatusBadge";

interface HeaderProps {
  title?: string;
  onAddTransactionClick?: () => void;
  onMenuClick?: () => void;
}

export default function Header({
  title = "Dashboard",
  onAddTransactionClick,
  onMenuClick,
}: HeaderProps) {
  return (
    <header className="h-16 border-b border-border bg-surface/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Title & Hamburger Menu */}
      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 mr-2 rounded-lg text-text-secondary hover:text-white hover:bg-surface-raised transition-colors"
          title="Open Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base sm:text-xl font-semibold text-text-primary tracking-tight">
          {title}
        </h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Sync Status Badge */}
        <SyncStatusBadge />

        {/* Add Action (Conditional based on handler presence) */}
        {onAddTransactionClick && (
          <button
            onClick={onAddTransactionClick}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-accent hover:bg-accent/90 text-text-primary rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4.5 w-4.5" />
            <span className="hidden sm:inline">
              {title === "Investments" ? "Add Investment" : "Add Transaction"}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}
