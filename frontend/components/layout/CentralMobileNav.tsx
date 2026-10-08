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
      label: "Home",
      href: "/finance",
      icon: Home,
      isActive: pathname === "/finance",
    },
    {
      id: "transactions",
      label: "Transactions",
      href: "/finance/transactions",
      icon: ArrowLeftRight,
      isActive: pathname === "/finance/transactions",
    },
    {
      id: "accounts",
      label: "Accounts",
      href: "/finance/accounts",
      icon: Wallet,
      isActive: pathname === "/finance/accounts",
    },
    {
      id: "budget",
      label: "Budget",
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
      {/* Floating Apps Drawer Sheet for Secondary Modules */}
      <AnimatePresence>
        {showAppsSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAppsSheet(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="lg:hidden fixed bottom-24 left-4 right-4 z-50 p-5 rounded-3xl bg-[#121216]/95 border border-white/15 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
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
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
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

      {/* Floating Central Glassmorphic Dock (Inspired by Reference Screenshot) */}
      <nav
        aria-label="Central Navigation Bar"
        className="lg:hidden fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center pointer-events-auto select-none"
      >
        <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-[#101014]/85 backdrop-blur-2xl border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
          {coreNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
                  item.isActive
                    ? "w-11 h-11 bg-white text-black shadow-lg shadow-white/20 scale-100"
                    : "w-10 h-10 text-neutral-400 hover:text-white hover:bg-white/10 active:scale-95"
                }`}
                title={item.label}
              >
                <Icon className="h-5 w-5" strokeWidth={item.isActive ? 2.5 : 2} />
              </Link>
            );
          })}

          {/* 5th Icon: Apps / Life OS Switcher */}
          <button
            type="button"
            onClick={() => setShowAppsSheet(!showAppsSheet)}
            className={`relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer ${
              isMoreAppActive || showAppsSheet
                ? "w-11 h-11 bg-white text-black shadow-lg shadow-white/20 scale-100"
                : "w-10 h-10 text-neutral-400 hover:text-white hover:bg-white/10 active:scale-95"
            }`}
            title="More Modules"
          >
            <LayoutGrid className="h-5 w-5" strokeWidth={isMoreAppActive || showAppsSheet ? 2.5 : 2} />
          </button>
        </div>
      </nav>
    </>
  );
}
