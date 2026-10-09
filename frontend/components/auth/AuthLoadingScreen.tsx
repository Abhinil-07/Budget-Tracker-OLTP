"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, Flame, Target, ArrowRight } from "lucide-react";

interface AuthLoadingScreenProps {
  statusMessage?: string;
  isCompleted?: boolean;
  step?: number; // 0, 1, 2
}

// Curated uplifting & motivating financial/life quotes
const FEEL_GOOD_MESSAGES = [
  {
    badge: "TODAY'S FOCUS",
    headline: "A NEW GOAL FOR YOU",
    quote:
      "“Small disciplines repeated with consistency every day lead to great achievements. Your financial journey begins now.”",
    author: "Personal Finance OS",
  },
  {
    badge: "MINDSET",
    headline: "BUILD YOUR FREEDOM",
    quote:
      "“Hard times produce strong people. Strong people create good times. Master your cash flow, design your future.”",
    author: "Daily Affirmation",
  },
  {
    badge: "CLARITY",
    headline: "FINANCIAL MASTERY",
    quote:
      "“Clarity precedes mastery. Every transaction logged is a direct step toward complete peace of mind.”",
    author: "Life OS Intelligence",
  },
  {
    badge: "MOMENTUM",
    headline: "MAKE TODAY COUNT",
    quote:
      "“Wealth is not about having a lot of money; it's about having a lot of options. You're taking control today.”",
    author: "Daily Motivation",
  },
  {
    badge: "DISCIPLINE",
    headline: "TAKE COMMAND",
    quote:
      "“Do not save what is left after spending, but spend what is left after saving. Every intentional choice builds your wealth.”",
    author: "Financial Wisdom",
  },
  {
    badge: "PERSPECTIVE",
    headline: "ONE STEP CLOSER",
    quote:
      "“Financial freedom is available to those who learn about it and work for it. You showed up today — that's half the battle.”",
    author: "Daily Mindset",
  },
];

export default function AuthLoadingScreen({
  statusMessage = "Synchronizing your financial workspace...",
  isCompleted = false,
  step = 0,
}: AuthLoadingScreenProps) {
  // Pick random or rotating message
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    // Pick an inspiring quote based on current day or random
    const idx = Math.floor(Math.random() * FEEL_GOOD_MESSAGES.length);
    setQuoteIndex(idx);
  }, []);

  const currentMsg = FEEL_GOOD_MESSAGES[quoteIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07070A] text-white overflow-hidden select-none">
      {/* 
        ====================================================================
        COBALT SAPPHIRE AURORA GRADIENT ANIMATION (Bottom-to-Top, Top-to-Bottom)
        Inspired by the transaction recording animation and reference image
        ====================================================================
      */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Main Sweeping Vertical Aurora Wave */}
        <motion.div
          initial={{ y: "45%", opacity: 0.75, scale: 0.95 }}
          animate={{
            y: ["45%", "-35%", "45%"],
            opacity: [0.75, 0.95, 0.75],
            scale: [0.95, 1.15, 0.95],
          }}
          transition={{
            duration: 5.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute left-1/2 -translate-x-1/2 w-[520px] sm:w-[700px] h-[450px] sm:h-[550px] rounded-full blur-[100px] sm:blur-[135px]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(59,130,246,0.95) 0%, rgba(37,99,235,0.85) 30%, rgba(14,165,233,0.6) 65%, rgba(99,102,241,0.2) 85%, transparent 100%)",
          }}
        />

        {/* Secondary Harmonic Aurora Ambient Bloom */}
        <motion.div
          initial={{ opacity: 0.4, scale: 0.9 }}
          animate={{
            opacity: [0.35, 0.65, 0.35],
            scale: [0.95, 1.05, 0.95],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] sm:w-[500px] h-[380px] sm:h-[500px] rounded-full blur-[110px]"
          style={{
            background:
              "radial-gradient(circle, rgba(96,165,250,0.6) 0%, rgba(30,58,138,0.4) 60%, transparent 100%)",
          }}
        />
      </div>

      {/* 
        ====================================================================
        FOREGROUND CONTENT CONTAINER (Minimalism Style from Reference Image)
        ====================================================================
      */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md px-6 flex flex-col justify-between items-center h-full max-h-[640px] py-10 sm:py-14 text-center">
        {/* Top Branding Pill / Badge */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-300" />
          <span className="text-xs font-bold tracking-tight text-white/90 font-mono">
            Personal Finance OS
          </span>
        </motion.div>

        {/* Center Card Content: Today's Goal & Affirmation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="space-y-4 my-auto"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold tracking-widest uppercase text-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>{currentMsg.badge}</span>
          </div>

          {/* Bold Minimalist Title */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            {currentMsg.headline}
          </h2>

          {/* Inspiring Feel-Good Quote */}
          <p className="text-xs sm:text-sm text-neutral-300/90 font-normal leading-relaxed max-w-xs sm:max-w-sm mx-auto italic">
            {currentMsg.quote}
          </p>

          <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
            — {currentMsg.author}
          </p>
        </motion.div>

        {/* Bottom Status Feedback: Progress Dots & Live Spinner / Tick */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full space-y-4 flex flex-col items-center"
        >
          {/* 3-Pill Pagination Dots (from reference screenshot) */}
          <div className="flex items-center gap-1.5">
            <div
              className={`h-1 rounded-full transition-all duration-500 ${
                step === 0 ? "w-6 bg-white shadow-sm" : "w-1.5 bg-white/30"
              }`}
            />
            <div
              className={`h-1 rounded-full transition-all duration-500 ${
                step === 1 ? "w-6 bg-white shadow-sm" : "w-1.5 bg-white/30"
              }`}
            />
            <div
              className={`h-1 rounded-full transition-all duration-500 ${
                step >= 2 ? "w-6 bg-white shadow-sm" : "w-1.5 bg-white/30"
              }`}
            />
          </div>

          {/* Status feedback indicator pill */}
          <div className="p-3 px-5 rounded-full bg-black/40 backdrop-blur-xl border border-white/15 flex items-center justify-center gap-2.5 text-xs font-semibold text-white/90 shadow-xl">
            {isCompleted ? (
              <>
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span>Workspace Ready! Entering...</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
                </span>
                <span className="tracking-tight">{statusMessage}</span>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
