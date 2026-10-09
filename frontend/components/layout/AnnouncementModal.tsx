"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Check, Rocket, ArrowRight } from "lucide-react";
import { useAuthStore } from "../../stores/useAuthStore";
import { CURRENT_ANNOUNCEMENT } from "../../config/announcements";

export default function AnnouncementModal() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!CURRENT_ANNOUNCEMENT) {
      setIsOpen(false);
      return;
    }

    // Check expiration date
    if (CURRENT_ANNOUNCEMENT.expiresAt) {
      const expiry = new Date(CURRENT_ANNOUNCEMENT.expiresAt).getTime();
      if (Date.now() > expiry) {
        setIsOpen(false);
        return;
      }
    }

    // Check if user has already seen this announcement
    const userId = user?.id || "guest";
    const storageKey = `announcement_seen_${userId}_${CURRENT_ANNOUNCEMENT.id}`;
    const alreadySeen = localStorage.getItem(storageKey);

    if (!alreadySeen) {
      // Natural 400ms delay after page load before modal smoothly slides in
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [user?.id]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleDismiss = () => {
    if (!CURRENT_ANNOUNCEMENT) return;
    const userId = user?.id || "guest";
    const storageKey = `announcement_seen_${userId}_${CURRENT_ANNOUNCEMENT.id}`;
    localStorage.setItem(storageKey, "true");
    setIsOpen(false);
  };

  if (!CURRENT_ANNOUNCEMENT || !isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
        {/* Screen-blocking Dark Backdrop with deep blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
          className="absolute inset-0 bg-black/85 backdrop-blur-xl"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-[#0D0D12] border border-white/10 rounded-[32px] p-6 sm:p-7 shadow-[0_24px_70px_rgba(0,0,0,0.85)] z-10 overflow-hidden"
        >
          {/* Ambient atmospheric corner glow matching existing modals */}
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none blur-3xl opacity-30 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full pointer-events-none blur-3xl opacity-25 bg-gradient-to-tr from-cyan-500 to-emerald-500" />

          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-white/[0.08] relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/25 text-[10px] font-bold text-purple-200 uppercase tracking-wider mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{CURRENT_ANNOUNCEMENT.badge}</span>
              </div>
              <h3 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <Rocket className="w-5 h-5 text-purple-300 shrink-0" />
                <span>{CURRENT_ANNOUNCEMENT.title}</span>
              </h3>
              <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                Released {CURRENT_ANNOUNCEMENT.date}
              </p>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Description & Features Body */}
          <div className="mt-4 space-y-4 relative z-10">
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              {CURRENT_ANNOUNCEMENT.description}
            </p>

            {CURRENT_ANNOUNCEMENT.features && CURRENT_ANNOUNCEMENT.features.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Key Improvements
                </span>
                <div className="space-y-2">
                  {CURRENT_ANNOUNCEMENT.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3 text-xs text-neutral-200 font-medium"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-3.5 px-4 rounded-full font-bold text-xs sm:text-sm bg-white hover:bg-neutral-100 active:scale-[0.99] text-black transition-all shadow-xl shadow-white/10 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Got it, let's go</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
