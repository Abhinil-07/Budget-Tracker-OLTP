"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  ArrowLeftRight,
  Wallet,
  PieChart,
  LayoutGrid,
  X,
  Dumbbell,
  UtensilsCrossed,
  BookOpen,
  Settings,
  Scale,
  TrendingUp,
} from "lucide-react";

export default function CentralMobileNav() {
  const pathname = usePathname();
  const [showAppsSheet, setShowAppsSheet] = useState(false);

  const coreNavItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      shortcut: "1",
      href: "/finance",
      icon: Home,
      isActive: pathname === "/finance",
    },
    {
      id: "transactions",
      label: "Transactions",
      shortcut: "2",
      href: "/finance/transactions",
      icon: ArrowLeftRight,
      isActive: pathname === "/finance/transactions",
    },
    {
      id: "accounts",
      label: "Cards & Accounts",
      shortcut: "3",
      href: "/finance/accounts",
      icon: Wallet,
      isActive: pathname === "/finance/accounts",
    },
    {
      id: "budget",
      label: "Budget & Stats",
      shortcut: "4",
      href: "/finance/budget",
      icon: PieChart,
      isActive: pathname === "/finance/budget",
    },
  ];

  const moreApps = [
    { label: "Reconciliation", href: "/finance/reconciliation", icon: Scale, tag: "Finance" },
    { label: "Investments", href: "/finance/investments", icon: TrendingUp, tag: "Finance" },
    { label: "Gym Tracker", href: "/gym", icon: Dumbbell, tag: "Life OS" },
    { label: "Food Log", href: "/food", icon: UtensilsCrossed, tag: "Life OS" },
    { label: "Reading Library", href: "/reading", icon: BookOpen, tag: "Life OS" },
    { label: "Settings", href: "/settings", icon: Settings, tag: "System" },
  ];

  const isMoreAppActive = moreApps.some((app) => pathname.startsWith(app.href));

  return (
    <>
      {/* Floating Apps Drawer / Popover (Adapts to Mobile Sheet & Desktop Popover) */}
      <AnimatePresence>
        {showAppsSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAppsSheet(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 320 }}
              className="fixed bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[380px] z-50 p-5 rounded-3xl bg-[#121216]/95 border border-white/15 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.85)] ring-1 ring-white/10 max-h-[75vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Life OS Modules
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAppsSheet(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {moreApps.map((app) => {
                  const isActive = pathname === app.href;
                  const Icon = app.icon;
                  return (
                    <Link
                      key={app.href}
                      href={app.href}
                      onClick={() => setShowAppsSheet(false)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all touch-manipulation ${
                        isActive
                          ? "bg-white text-black border-white shadow-md font-bold"
                          : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs truncate font-medium">{app.label}</div>
                        <div
                          className={`text-[9px] uppercase tracking-wider ${
                            isActive ? "text-neutral-600 font-semibold" : "text-neutral-500"
                          }`}
                        >
                          {app.tag}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Central Glassmorphic Dock for Both Desktop & Mobile */}
      <nav
        aria-label="Central Navigation Dock"
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center pointer-events-auto select-none touch-manipulation"
      >
        <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-full bg-[#101014]/90 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.85)] ring-1 ring-white/10">
          {coreNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="relative group flex items-center justify-center">
                {/* Desktop Hover Tooltip */}
                <div className="hidden sm:group-hover:flex absolute -top-10 px-2.5 py-1 rounded-xl bg-[#14141a]/95 border border-white/15 text-white text-[11px] font-semibold tracking-tight shadow-2xl pointer-events-none whitespace-nowrap items-center gap-1.5 animate-in fade-in duration-150">
                  <span>{item.label}</span>
                </div>

                <Link
                  href={item.href}
                  className={`relative flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 touch-manipulation ${
                    item.isActive
                      ? "w-11 h-11 sm:w-12 sm:h-12 bg-white text-black shadow-lg shadow-white/20 scale-100"
                      : "w-11 h-11 sm:w-11 sm:h-11 text-neutral-400 hover:text-white hover:bg-white/10"
                  }`}
                  title={item.label}
                >
                  <Icon className="h-5 w-5" strokeWidth={item.isActive ? 2.5 : 2} />
                </Link>
              </div>
            );
          })}

          {/* 5th Icon: Apps / Life OS Switcher */}
          <div className="relative group flex items-center justify-center">
            {/* Desktop Hover Tooltip */}
            <div className="hidden sm:group-hover:flex absolute -top-10 px-2.5 py-1 rounded-xl bg-[#14141a]/95 border border-white/15 text-white text-[11px] font-semibold tracking-tight shadow-2xl pointer-events-none whitespace-nowrap items-center gap-1.5 animate-in fade-in duration-150">
              <span>All Modules</span>
            </div>

            <button
              type="button"
              onClick={() => setShowAppsSheet(!showAppsSheet)}
              className={`relative flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer active:scale-95 touch-manipulation ${
                isMoreAppActive || showAppsSheet
                  ? "w-11 h-11 sm:w-12 sm:h-12 bg-white text-black shadow-lg shadow-white/20 scale-100"
                  : "w-11 h-11 sm:w-11 sm:h-11 text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
              title="More Modules"
            >
              <LayoutGrid className="h-5 w-5" strokeWidth={isMoreAppActive || showAppsSheet ? 2.5 : 2} />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
