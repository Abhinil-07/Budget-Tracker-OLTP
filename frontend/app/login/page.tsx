"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const { token, hydrated, hydrate, setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Gradient Theme Variant (Purple matching Frame 1, Blue matching Frame 2)
  const [gradientTheme, setGradientTheme] = useState<"purple" | "blue">("purple");

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // If already logged in, go to dashboard
  useEffect(() => {
    if (hydrated && token) {
      window.location.href = "/finance";
    }
  }, [hydrated, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const endpoint = isSignUp ? "/api/auth/signup" : "/api/auth/login";

    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      const resJson = await response.json();

      if (!response.ok) {
        // Map backend consistent envelope error message if present
        const errMessage = resJson?.error?.message || resJson?.detail || "Authentication failed";
        throw new Error(errMessage);
      }

      if (isSignUp) {
        setSuccessMessage("Account created successfully! You can now log in.");
        setIsSignUp(false);
        setPassword("");
      } else {
        const authData = resJson.data;
        if (!authData?.access_token || !authData?.user) {
          throw new Error("Invalid session response payload from authentication service.");
        }
        setAuth(authData.access_token, {
          email: authData.user.email,
          id: authData.user.id,
        });
        window.location.href = "/finance";
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Radial gradient background inspired by reference image
  const backgroundStyle =
    gradientTheme === "purple"
      ? {
          background:
            "radial-gradient(135% 85% at 50% 0%, #7622C9 0%, #4A127F 26%, #22073E 52%, #0A0214 74%, #000000 100%)",
        }
      : {
          background:
            "radial-gradient(135% 85% at 50% 0%, #1D4ED8 0%, #1E3A8A 28%, #0C1E47 52%, #030816 74%, #000000 100%)",
        };

  // Show spinner until hydration completes
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white border-r-2" />
      </div>
    );
  }

  // If already logged in, show nothing (redirect is happening)
  if (token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white border-r-2" />
      </div>
    );
  }

  return (
    <div
      style={backgroundStyle}
      className="min-h-screen text-white flex flex-col justify-between p-5 sm:p-8 select-none relative overflow-hidden transition-colors duration-700"
    >
      {/* Luminous Top Diffuse Glow Blob */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-[550px] sm:w-[700px] h-[340px] rounded-full blur-[110px] pointer-events-none transition-colors duration-700 ${
          gradientTheme === "purple" ? "bg-[#9333ea]/20" : "bg-[#2563eb]/20"
        }`}
      />

      {/* Top Header Bar with Theme Variant Toggles */}
      <header className="relative z-10 flex items-center justify-between max-w-4xl w-full mx-auto pt-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 shadow-sm">
          <Sparkles
            className={`h-4 w-4 ${
              gradientTheme === "purple" ? "text-fuchsia-300" : "text-sky-300"
            }`}
          />
          <span className="text-xs font-bold tracking-tight text-white/90">
            Personal Finance OS
          </span>
        </div>

        {/* Aura Theme Variant Selector (Purple vs Blue matching the 2 frames) */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/40 backdrop-blur-xl border border-white/10">
          <button
            type="button"
            onClick={() => setGradientTheme("purple")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              gradientTheme === "purple"
                ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                : "text-neutral-400 hover:text-white"
            }`}
            title="Purple Aura (Frame 1)"
          >
            <span className="w-2 h-2 rounded-full bg-purple-300" />
            <span className="hidden xs:inline">Purple</span>
          </button>
          <button
            type="button"
            onClick={() => setGradientTheme("blue")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              gradientTheme === "blue"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                : "text-neutral-400 hover:text-white"
            }`}
            title="Blue Aura (Frame 2)"
          >
            <span className="w-2 h-2 rounded-full bg-blue-300" />
            <span className="hidden xs:inline">Blue</span>
          </button>
        </div>
      </header>

      {/* Central Content Area: Hero Headline + Glassmorphic Modal */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-8 max-w-md w-full mx-auto">
        {/* Typographic Hero Greeting (Inspired by Reference Screenshot) */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-7 space-y-1"
        >
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight font-sans text-white">
            Hello{" "}
            <span
              className={`transition-colors duration-500 ${
                gradientTheme === "purple"
                  ? "text-[#C084FC] drop-shadow-[0_0_25px_rgba(192,132,252,0.4)]"
                  : "text-[#60A5FA] drop-shadow-[0_0_25px_rgba(96,165,250,0.4)]"
              }`}
            >
              Ansh
            </span>
          </h1>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-white/90">
            May I help you?
          </p>
          <p className="text-xs text-white/60 pt-1 font-medium max-w-xs mx-auto">
            {isSignUp
              ? "Register your secure command profile to start tracking balances."
              : "Access your cards, live ledger, and weekly analytics."}
          </p>
        </motion.div>

        {/* Glassmorphic Login Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 260, damping: 22 }}
          className="w-full bg-[#101016]/80 backdrop-blur-3xl border border-white/15 rounded-[32px] sm:rounded-[36px] p-6 sm:p-8 shadow-[0_30px_70px_rgba(0,0,0,0.9)] ring-1 ring-white/10 relative overflow-hidden"
        >
          {/* Subtle Corner Glow Accent */}
          <div
            className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl pointer-events-none transition-colors duration-700 ${
              gradientTheme === "purple" ? "bg-fuchsia-600/20" : "bg-blue-600/20"
            }`}
          />

          {/* Segmented Auth Mode Switcher (Sign In vs Create Account) */}
          <div className="flex p-1 bg-white/[0.06] border border-white/10 rounded-full mb-6 relative z-10">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                !isSignUp
                  ? "bg-white text-black shadow-lg shadow-white/10 scale-100"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isSignUp
                  ? "bg-white text-black shadow-lg shadow-white/10 scale-100"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Feedback Alerts */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 px-4 py-2.5 rounded-2xl text-xs font-medium flex items-center gap-2 shadow-sm"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-4 py-2.5 rounded-2xl text-xs font-medium flex items-center gap-2 shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form className="space-y-4 relative z-10" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-white/70 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full bg-white/[0.05] border border-white/12 rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40 focus:bg-white/[0.08] transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-white/70 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white/[0.05] border border-white/12 rounded-2xl pl-11 pr-11 py-3 text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40 focus:bg-white/[0.08] transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl font-extrabold text-xs sm:text-sm bg-white text-black hover:bg-neutral-100 active:scale-[0.98] shadow-xl shadow-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>
                  {loading
                    ? isSignUp
                      ? "Creating Profile..."
                      : "Authenticating..."
                    : isSignUp
                    ? "Get Started"
                    : "Enter Command Center"}
                </span>
                {!loading && <ArrowRight className="h-4 w-4 stroke-[2.5]" />}
              </button>
            </div>
          </form>

          {/* Footnote */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center relative z-10">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-white/40">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Secured by Supabase Vault</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer Bottom Bar */}
      <footer className="relative z-10 text-center text-[11px] text-white/40 max-w-4xl w-full mx-auto pb-2">
        <span>Personal Finance Tracker · Production Grade · 2026</span>
      </footer>
    </div>
  );
}
