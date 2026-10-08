"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import ModuleRail from "./ModuleRail";
import CentralMobileNav from "./CentralMobileNav";
import ModuleSidebar from "./ModuleSidebar";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const subItems = activeModule.subItems || [];
  const hasSubNav = subItems.length > 0;

  return (
    <div className="flex flex-col h-screen bg-background text-text-primary overflow-hidden">
      <div className="flex flex-1 overflow-hidden h-full">
        {/* Level 1: Desktop Rail */}
        <ModuleRail />

        {/* Level 2: Desktop Module-specific Sidebar */}
        {hasSubNav && (
          <ModuleSidebar
            moduleLabel={activeModule.label}
            items={subItems}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          <Header
            title={title || activeModule.label}
            onAddTransactionClick={onAddTransactionClick}
            actionLabel={actionLabel}
            onMenuClick={() => setIsSidebarOpen(true)}
            hasSubNav={hasSubNav}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-28 lg:pb-8 bg-background">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Floating Central Glassmorphic Dock for Mobile Screens */}
      <CentralMobileNav />
    </div>
  );
}
