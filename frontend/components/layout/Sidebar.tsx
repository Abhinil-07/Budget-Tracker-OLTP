"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "../../stores/useAuthStore";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PieChart,
  Settings,
  Activity,
  LogOut,
  X,
} from "lucide-react";

const NAVIGATION_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { name: "Accounts", href: "/accounts", icon: Wallet },
  { name: "Budget", href: "/budget", icon: PieChart },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { token, user, logout } = useAuthStore();

  const handleLogout = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const isLocalDev =
      !supabaseAnonKey ||
      supabaseAnonKey === "your-anon-key-here" ||
      supabaseAnonKey.trim() === "";

    if (!isLocalDev && token) {
      try {
        await fetch(`${supabaseUrl}/auth/v1/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey || "",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error("Supabase signOut error:", err);
      }
    }

    logout();
    window.location.href = "/login";
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border flex flex-col h-screen transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-accent" />
            <span className="font-semibold text-lg text-text-primary tracking-tight">
              Finance Command
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-surface-raised transition-colors"
            title="Close Menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
          {NAVIGATION_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? "bg-accent/10 text-accent font-semibold border-l-2 border-accent rounded-l-none"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-raised"
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-transform duration-200 group-hover:scale-105 ${
                    isActive ? "text-accent" : "text-text-muted group-hover:text-text-secondary"
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Card */}
        {user && (
          <div className="mx-4 mb-2 p-3 bg-surface-raised/40 border border-border/60 rounded-xl flex items-center gap-3 select-none">
            <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent font-mono text-sm font-bold uppercase shrink-0">
              {user.email ? user.email[0] : "U"}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] uppercase font-mono tracking-widest text-[#8888AA] block">Logged In As</span>
              <span className="text-xs text-white truncate font-medium block mt-0.5" title={user.email}>
                {user.email || "Unknown User"}
              </span>
            </div>
          </div>
        )}

        {/* Logout Action Area */}
        <div className="px-4 py-2 border-t border-border bg-surface">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-danger hover:bg-danger/10 transition-all duration-200 group"
          >
            <LogOut className="h-5 w-5 text-text-muted group-hover:text-danger transition-colors duration-200" />
            <span>Logout</span>
          </button>
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-border bg-surface/50 text-center">
          <p className="text-[10px] text-text-muted uppercase tracking-widest font-mono">
            v1.0.0 // PRODUCTION
          </p>
        </div>
      </aside>
    </>
  );
}
