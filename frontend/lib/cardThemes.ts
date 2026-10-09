"use client";

import { useState, useEffect, useCallback } from "react";
import { Account } from "../types/account";

export interface CardTheme {
  id: string;
  name: string;
  previewColor: string;
  cardBg: string;
  ambientGlow: string;
  spotlightColor: string;
  borderColor: string;
  accentPill: string;
  btnPill: string;
  glowShadow: string;
}

export const CARD_THEMES: CardTheme[] = [
  {
    id: "sage",
    name: "Frosty Sage",
    previewColor: "#76988C",
    cardBg: "bg-[#091411]",
    ambientGlow:
      "radial-gradient(125% 125% at 50% 50%, #050908 0%, #0B1814 20%, #39554C 58%, #76988C 88%, #8AA99E 100%)",
    spotlightColor: "rgba(138, 169, 158, 0.45)",
    borderColor: "border-transparent",
    accentPill: "bg-[#39554C]/70 text-[#EAF3EF] shadow-sm",
    btnPill: "bg-black/40 hover:bg-black/60 text-white/95 hover:text-white",
    glowShadow: "shadow-[0_16px_36px_-8px_rgba(118,152,140,0.45)]",
  },
  {
    id: "cobalt",
    name: "Cobalt Slate",
    previewColor: "#38519B",
    cardBg: "bg-[#050914]",
    ambientGlow:
      "radial-gradient(125% 125% at 50% 50%, #03050C 0%, #060B1A 25%, #152244 65%, #273A71 100%)",
    spotlightColor: "rgba(39, 58, 113, 0.35)",
    borderColor: "border-transparent",
    accentPill: "bg-[#152244]/75 text-[#C7D4F0] shadow-sm",
    btnPill: "bg-black/40 hover:bg-black/60 text-white/95 hover:text-white",
    glowShadow: "shadow-[0_16px_36px_-8px_rgba(39,58,113,0.35)]",
  },
  {
    id: "orchid",
    name: "Mauve Orchid",
    previewColor: "#A65C88",
    cardBg: "bg-[#14050E]",
    ambientGlow:
      "radial-gradient(125% 125% at 50% 50%, #180611 0%, #300C22 25%, #632448 65%, #A65C88 100%)",
    spotlightColor: "rgba(166, 92, 136, 0.35)",
    borderColor: "border-transparent",
    accentPill: "bg-[#632448]/75 text-[#F5D8E8] shadow-sm",
    btnPill: "bg-black/40 hover:bg-black/60 text-white/95 hover:text-white",
    glowShadow: "shadow-[0_16px_36px_-8px_rgba(166,92,136,0.35)]",
  },
  {
    id: "terracotta",
    name: "Clay Terracotta",
    previewColor: "#944838",
    cardBg: "bg-[#120402]",
    ambientGlow:
      "radial-gradient(125% 125% at 50% 50%, #180503 0%, #2E0D07 25%, #5D2318 65%, #944838 100%)",
    spotlightColor: "rgba(148, 72, 56, 0.35)",
    borderColor: "border-transparent",
    accentPill: "bg-[#5D2318]/75 text-[#F6D9D2] shadow-sm",
    btnPill: "bg-black/40 hover:bg-black/60 text-white/95 hover:text-white",
    glowShadow: "shadow-[0_16px_36px_-8px_rgba(148,72,56,0.35)]",
  },
  {
    id: "amber",
    name: "Golden Amber",
    previewColor: "#D97706",
    cardBg: "bg-[#140F05]",
    ambientGlow:
      "radial-gradient(125% 125% at 50% 50%, #140F05 0%, #291804 25%, #5E390A 65%, #B45309 100%)",
    spotlightColor: "rgba(217, 119, 6, 0.35)",
    borderColor: "border-transparent",
    accentPill: "bg-[#5E390A]/75 text-[#FDE68A] shadow-sm",
    btnPill: "bg-black/40 hover:bg-black/60 text-white/95 hover:text-white",
    glowShadow: "shadow-[0_16px_36px_-8px_rgba(217,119,6,0.35)]",
  },
  {
    id: "amethyst",
    name: "Royal Violet",
    previewColor: "#8B5CF6",
    cardBg: "bg-[#0D0514]",
    ambientGlow:
      "radial-gradient(125% 125% at 50% 50%, #0D0514 0%, #1A0B2E 25%, #3B1869 65%, #7C3AED 100%)",
    spotlightColor: "rgba(139, 92, 246, 0.35)",
    borderColor: "border-transparent",
    accentPill: "bg-[#3B1869]/75 text-[#DDD6FE] shadow-sm",
    btnPill: "bg-black/40 hover:bg-black/60 text-white/95 hover:text-white",
    glowShadow: "shadow-[0_16px_36px_-8px_rgba(139,92,246,0.35)]",
  },
];

export function getCardThemeById(themeId?: string | null): CardTheme {
  if (!themeId) return CARD_THEMES[0];
  const found = CARD_THEMES.find((t) => t.id === themeId);
  return found || CARD_THEMES[0];
}

export function parseThemeFromAccountNumber(accountNumber?: string | null): string | null {
  if (!accountNumber) return null;
  if (accountNumber.includes("#")) {
    const parts = accountNumber.split("#");
    const candidate = parts[parts.length - 1].trim();
    if (CARD_THEMES.some((t) => t.id === candidate)) {
      return candidate;
    }
  }
  return null;
}

export function formatAccountNumberWithTheme(accountNumber?: string | null, themeId?: string | null): string {
  const cleanNumber = (accountNumber || "").split("#")[0].trim();
  if (themeId && themeId !== "sage") {
    return cleanNumber ? `${cleanNumber}#${themeId}` : `#${themeId}`;
  }
  return cleanNumber;
}

export function getAccountTheme(account?: Account | null, defaultIndex: number = 0): CardTheme {
  if (!account) return CARD_THEMES[defaultIndex % CARD_THEMES.length];

  // 1. Check local storage user preference
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(`card_theme_${account.id}`);
    if (stored) {
      const found = CARD_THEMES.find((t) => t.id === stored);
      if (found) return found;
    }
  }

  // 2. Check account_number metadata tag
  const fromNumber = parseThemeFromAccountNumber(account.account_number);
  if (fromNumber) {
    const found = CARD_THEMES.find((t) => t.id === fromNumber);
    if (found) return found;
  }

  // 3. Fallback to default index
  return CARD_THEMES[defaultIndex % CARD_THEMES.length];
}

export function setAccountTheme(accountId: string, themeId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`card_theme_${accountId}`, themeId);
  window.dispatchEvent(
    new CustomEvent("card_theme_change", { detail: { accountId, themeId } })
  );
}

export function useAccountTheme(account?: Account | null, defaultIndex: number = 0): [CardTheme, (newThemeId: string) => void] {
  const [theme, setThemeState] = useState<CardTheme>(() => getAccountTheme(account, defaultIndex));

  useEffect(() => {
    setThemeState(getAccountTheme(account, defaultIndex));
  }, [account?.id, account?.account_number, defaultIndex]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ accountId: string; themeId: string }>;
      if (account && customEvent.detail?.accountId === account.id) {
        setThemeState(getCardThemeById(customEvent.detail.themeId));
      }
    };

    window.addEventListener("card_theme_change", handler);
    return () => window.removeEventListener("card_theme_change", handler);
  }, [account?.id]);

  const updateTheme = useCallback(
    (newThemeId: string) => {
      if (account?.id) {
        setAccountTheme(account.id, newThemeId);
        setThemeState(getCardThemeById(newThemeId));
      }
    },
    [account?.id]
  );

  return [theme, updateTheme];
}
