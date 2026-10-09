"use client";

import React from "react";
import { CARD_THEMES, CardTheme } from "../../lib/cardThemes";
import { Check } from "lucide-react";

interface CardThemeSelectorProps {
  selectedThemeId: string;
  onSelectTheme: (themeId: string) => void;
  label?: string;
}

export default function CardThemeSelector({
  selectedThemeId,
  onSelectTheme,
  label = "Card Color Theme",
}: CardThemeSelectorProps) {
  return (
    <div className="space-y-2 select-none">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
          {label}
        </label>
        <span className="text-[11px] font-mono text-neutral-400">
          {CARD_THEMES.find((t) => t.id === selectedThemeId)?.name || "Frosty Sage"}
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-1.5 bg-[#141418] rounded-2xl border border-white/[0.08]">
        {CARD_THEMES.map((theme) => {
          const isSelected = selectedThemeId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelectTheme(theme.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-150 cursor-pointer ${
                isSelected
                  ? "bg-white/15 ring-2 ring-white/60 scale-[1.03] shadow-lg"
                  : "hover:bg-white/5 opacity-80 hover:opacity-100"
              }`}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shadow-md relative"
                style={{ backgroundColor: theme.previewColor }}
              >
                {isSelected && (
                  <Check className="h-3 w-3 text-black stroke-[3]" />
                )}
              </div>
              <span className="text-[10px] font-bold text-neutral-300 mt-1 truncate max-w-full">
                {theme.name.split(" ")[1] || theme.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
