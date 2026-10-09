"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, X, Check, AlertCircle, Sparkles, ShieldCheck } from "lucide-react";
import { useAuthStore } from "../../stores/useAuthStore";
import { api, ApiError } from "../../lib/api";

export default function LinkPhoneModal() {
  const { user, setUserPhone } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setIsOpen(false);
      return;
    }

    // Check if user already has a phone number
    if (user.phone) {
      setIsOpen(false);
      return;
    }

    // Check if dismissed previously for this user
    const dismissed = localStorage.getItem(`phone_prompt_dismissed_${user.id}`);
    if (!dismissed) {
      // Trigger modal once after a short 800ms natural delay
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [user?.id, user?.phone]);

  const handleClose = () => {
    if (user?.id) {
      localStorage.setItem(`phone_prompt_dismissed_${user.id}`, "true");
    }
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, "");

    if (cleanDigits.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const fullPhoneNumber = `${countryCode} ${cleanDigits.slice(-10)}`;

    try {
      const res = await api.auth.updatePhone(fullPhoneNumber);
      if (res.data?.phone) {
        setUserPhone(res.data.phone);
        if (user?.id) {
          localStorage.setItem(`phone_prompt_dismissed_${user.id}`, "true");
        }
        setIsSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
        }, 1200);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to link mobile number. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-[#0D0D12] border border-white/10 rounded-[32px] p-6 sm:p-7 shadow-[0_24px_70px_rgba(0,0,0,0.85)] z-10 overflow-hidden"
        >
          {/* Ambient corner glows */}
          <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full pointer-events-none blur-3xl opacity-25 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
          <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full pointer-events-none blur-3xl opacity-20 bg-gradient-to-tr from-cyan-500 to-emerald-500" />

          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-white/[0.08] relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-neutral-300 uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Account Profile</span>
              </div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                Add Mobile Number
              </h3>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Add your mobile number to complete your profile setup and enable future mobile notifications and alerts.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
              title="Skip for now"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4 relative z-10">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 px-3.5 py-2.5 rounded-2xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 px-3.5 py-2.5 rounded-2xl text-xs flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Mobile number linked successfully!</span>
              </div>
            )}

            <div>
              <label
                htmlFor="mobile-number-input"
                className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5"
              >
                Mobile Number
              </label>

              <div className="flex items-center gap-2">
                {/* Country Code Picker */}
                <div className="relative">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-[#14141A] border border-white/10 rounded-2xl px-3 py-3.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/40 transition-all font-mono appearance-none cursor-pointer pr-7"
                  >
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+65">🇸🇬 +65</option>
                  </select>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none text-[10px]">
                    ▼
                  </span>
                </div>

                {/* Number Input */}
                <div className="relative flex-1">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <input
                    id="mobile-number-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98765 43210"
                    maxLength={14}
                    className="w-full bg-[#14141A] border border-white/10 rounded-2xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/30 transition-all font-mono tracking-wider"
                  />
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1.5">
                One-time setup. Stored securely for your profile.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-3 rounded-full text-xs font-semibold text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer active:scale-95"
              >
                Skip for Now
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isSuccess}
                className="px-6 py-3 rounded-full text-xs font-bold text-black bg-white hover:bg-neutral-100 transition-all shadow-xl shadow-white/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Linked!</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Link Number</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
