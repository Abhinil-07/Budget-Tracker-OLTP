"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LIFE_OS_MODULES, BOTTOM_MODULES, getActiveModule } from "./navConfig";

interface ModuleRailProps {
  className?: string;
}

export default function ModuleRail({ className = "" }: ModuleRailProps) {
  const pathname = usePathname();
  const activeModule = getActiveModule(pathname);

  return (
    <nav
      aria-label="Module Switcher"
      className={`hidden lg:flex flex-col items-center w-14 bg-[#0E0E0E] border-r border-border py-4 shrink-0 z-30 select-none ${className}`}
    >
      <div className="mb-4 flex items-center justify-center">
        <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-accent font-mono text-xs font-bold tracking-tight shadow-sm">
          OS
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5 flex-1">
        {LIFE_OS_MODULES.map((mod) => {
          const isActive = activeModule.id === mod.id;
          const Icon = mod.icon;
          return (
            <Link
              key={mod.id}
              href={mod.href}
              title={mod.label}
              className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 group ${
                isActive
                  ? "bg-accent/15 text-accent shadow-sm"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-raised"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-accent" />
              )}
              <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="absolute left-12 px-2 py-1 bg-surface-raised border border-border text-text-primary text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-md transition-opacity">
                {mod.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-1 pt-3 border-t border-border w-full">
        {BOTTOM_MODULES.map((mod) => {
          const isActive = activeModule.id === mod.id;
          const Icon = mod.icon;
          return (
            <Link
              key={mod.id}
              href={mod.href}
              title={mod.label}
              className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 group ${
                isActive
                  ? "bg-accent/15 text-accent shadow-sm"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-raised"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="absolute left-12 px-2 py-1 bg-surface-raised border border-border text-text-primary text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-md transition-opacity">
                {mod.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileModuleBar() {
  const pathname = usePathname();
  const activeModule = getActiveModule(pathname);
  const allMobileModules = [...LIFE_OS_MODULES, ...BOTTOM_MODULES];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0E0E0E] border-t border-border flex items-center justify-around px-1 py-1.5"
    >
      {allMobileModules.map((mod) => {
        const isActive = activeModule.id === mod.id;
        const Icon = mod.icon;
        return (
          <Link
            key={mod.id}
            href={mod.href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
              isActive ? "text-accent font-semibold" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={isActive ? 2.2 : 1.8} />
            <span className="text-[10px] tracking-tight">{mod.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
