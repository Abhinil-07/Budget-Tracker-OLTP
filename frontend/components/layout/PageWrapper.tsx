"use client";

import React from "react";
import { usePathname } from "next/navigation";
import CentralMobileNav from "./CentralMobileNav";
import Header from "./Header";
import { getActiveModule } from "./navConfig";

interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  onAddTransactionClick?: () => void;
  actionLabel?: string;
}

export default function PageWrapper({
  children,
  title,
  onAddTransactionClick,
  actionLabel,
}: PageWrapperProps) {
  const pathname = usePathname();
  const activeModule = getActiveModule(pathname);

  return (
    <div className="flex flex-col h-screen bg-background text-text-primary overflow-hidden">
      {/* Main Content Area - Full Width Cinematic Layout (Left Sidebar Removed) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Header
          title={title || activeModule.label}
          onAddTransactionClick={onAddTransactionClick}
          actionLabel={actionLabel}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-32 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Central Glassmorphic Dock for Both Desktop & Mobile */}
      <CentralMobileNav />
    </div>
  );
}
