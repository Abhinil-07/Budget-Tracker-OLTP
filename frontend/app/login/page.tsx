"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const { token, hydrated, hydrate, setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true); // Default to "Create account" matching reference

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

  const handleOAuthLogin = (provider: "google" | "azure") => {
    setError(`Direct ${provider === "google" ? "Google" : "Microsoft"} sign-in requires Supabase OAuth setup. Please enter your email and password above.`);
  };

  // Show spinner until hydration completes
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#0A0A0E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#BDB4FE] border-r-2" />
      </div>
    );
  }

  // If already logged in, show nothing (redirect is happening)
  if (token) {
    return (
      <div className="min-h-screen bg-[#0A0A0E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#BDB4FE] border-r-2" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090D] text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Subtle, non-vibrant ambient dark aura at top (matching screenshot) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-purple-950/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Centered Box Container (Matching reference screenshot exactly) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-[420px] mx-auto z-10 flex flex-col"
      >
        {/* Header Title & Subtitle */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight font-sans">
            {isSignUp ? "Create Finance account" : "Sign in to Finance"}
          </h1>
          <p className="mt-2.5 text-xs sm:text-sm text-neutral-400 font-normal leading-relaxed max-w-xs mx-auto">
            Start your experience with Finance by signing in or signing up.
          </p>
        </div>

        {/* Feedback Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-2.5 rounded-2xl text-xs font-medium flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-2.5 rounded-2xl text-xs font-medium flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Address */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs sm:text-sm font-medium text-neutral-300 mb-1.5"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full bg-[#111116] border border-white/10 hover:border-white/20 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 focus:bg-[#14141a] transition-all"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs sm:text-sm font-medium text-neutral-300 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-[#111116] border border-white/10 hover:border-white/20 rounded-2xl px-4 pr-11 py-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 focus:bg-[#14141a] transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Primary Action Button (Lilac/Lavender Pill from reference image) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl font-semibold text-sm bg-[#BDB4FE] hover:bg-[#ABA0FD] active:scale-[0.99] text-[#121216] transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>
                {loading
                  ? isSignUp
                    ? "Signing up..."
                    : "Signing in..."
                  : isSignUp
                  ? "Sign up"
                  : "Sign in"}
              </span>
            </button>
          </div>
        </form>

        {/* Social Authentication Buttons (Exact match to screenshot) */}
        <div className="mt-5 space-y-2.5">
          {/* Continue with Google */}
          <button
            type="button"
            onClick={() => handleOAuthLogin("google")}
            className="w-full bg-[#111116] hover:bg-[#16161d] active:scale-[0.99] border border-white/10 hover:border-white/20 rounded-2xl py-3.5 px-4 text-xs sm:text-sm font-medium text-white flex items-center justify-center gap-3 transition-all cursor-pointer"
          >
            {/* Google Icon */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Continue with Microsoft */}
          <button
            type="button"
            onClick={() => handleOAuthLogin("azure")}
            className="w-full bg-[#111116] hover:bg-[#16161d] active:scale-[0.99] border border-white/10 hover:border-white/20 rounded-2xl py-3.5 px-4 text-xs sm:text-sm font-medium text-white flex items-center justify-center gap-3 transition-all cursor-pointer"
          >
            {/* Microsoft Icon */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23">
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
            <span>Continue with Microsoft</span>
          </button>
        </div>

        {/* Toggle between Sign Up and Sign In */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSuccessMessage(null);
            }}
            className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            {isSignUp ? (
              <span>
                Already have an account? <strong className="text-white underline">Sign in</strong>
              </span>
            ) : (
              <span>
                Don't have an account? <strong className="text-white underline">Create one</strong>
              </span>
            )}
          </button>
        </div>

        {/* Privacy Policy Footer (Exact match to screenshot) */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-neutral-500">
            By creating an account, you agree to our{" "}
            <a href="#" className="underline text-neutral-400 hover:text-white transition-colors">
              Privacy Policy
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
