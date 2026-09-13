"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import type { SubNavItem } from "./navConfig";
import { LogOut, X } from "lucide-react";

interface ModuleSidebarProps {
  moduleLabel: string;
  items: SubNavItem[];
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ModuleSidebar({
  moduleLabel,
  items,
  isOpen = false,
  onClose,
}: ModuleSidebarProps) {
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

  if (!items || items.length === 0) return null;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-56 bg-surface border-r border-border flex flex-col h-screen transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 shrink-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-14 flex items-center justify-between px-5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono tracking-widest text-text-muted">Module</span>
            <span className="text-sm font-semibold text-text-primary tracking-tight">
              {moduleLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-surface-raised transition-colors"
            title="Close Sub-nav"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-accent/10 text-accent font-semibold border-l-2 border-accent rounded-l-none"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-raised"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${isActive ? "text-accent" : "text-text-muted"}`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="p-3 border-t border-border bg-surface/50">
            <div className="flex items-center justify-between mb-2">
              <div className="min-w-0 flex-1 pr-2">
                <span className="text-[9px] uppercase font-mono tracking-widest text-text-muted block">Account</span>
                <span className="text-xs text-text-primary truncate block" title={user.email}>
                  {user.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                title="Logout"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="text-[10px] text-text-muted font-mono tracking-wider">
              LIFE OS // v2.0
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
