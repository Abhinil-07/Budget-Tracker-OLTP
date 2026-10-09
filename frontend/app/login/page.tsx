"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { api, ApiError } from "../../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  KeyRound, 
  Smartphone, 
  ArrowRight,
  RotateCcw
} from "lucide-react";
import AuthLoadingScreen from "../../components/auth/AuthLoadingScreen";

export default function LoginPage() {
  const { token, hydrated, hydrate, setAuth } = useAuthStore();

  // Authentication Mode: "otp" (default) or "password"
  const [authMode, setAuthMode] = useState<"otp" | "password">("otp");

  // OTP State
  const [otpStep, setOtpStep] = useState<"identifier" | "verify">("identifier");
  const [identifier, setIdentifier] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Password State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Shared UI Feedback
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Cinematic Loading Screen states
  const [loadingScreenActive, setLoadingScreenActive] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("Synchronizing workspace...");
  const [isLoginCompleted, setIsLoginCompleted] = useState(false);

  // Aurora Theme (Purple / Blue)
  const [gradientTheme, setGradientTheme] = useState<"purple" | "blue">("purple");

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (hydrated && token) {
      window.location.href = "/finance";
    }
  }, [hydrated, token]);

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // 1. OTP Handler: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your email or registered mobile number.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await api.auth.sendOtp(identifier.trim());
      if (res.data) {
        setTargetEmail(res.data.email);
        setMaskedEmail(res.data.masked_email);
        setOtpStep("verify");
        setCountdown(60);
        setSuccessMessage("6-digit verification code has been dispatched. Enter it below to sign in.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to send OTP. Please check your email or mobile number.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 2. OTP Handler: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = otpCode.trim();
    if (cleanToken.length !== 6) {
      setError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.auth.verifyOtp(targetEmail, cleanToken);
      if (res.data?.access_token && res.data?.user) {
        setLoadingScreenActive(true);
        setLoadingStep(0);
        setLoadingStatus("Verifying secure credentials...");
        setAuth(
          res.data.access_token,
          {
            email: res.data.user.email,
            id: res.data.user.id,
            phone: res.data.user.phone || null,
          },
          res.data.refresh_token,
          res.data.expires_at
        );

        // Intentionally show a 3.5-4s delay so user can read the inspiring quote & observe wave animation
        setTimeout(() => {
          setLoadingStep(1);
          setLoadingStatus("Preparing your daily financial focus...");
        }, 1200);

        setTimeout(() => {
          setLoadingStep(2);
          setLoadingStatus("Synchronizing accounts & transactions...");
        }, 2400);

        setTimeout(() => {
          setLoadingStatus("Workspace ready! Entering...");
          setIsLoginCompleted(true);
          setTimeout(() => {
            window.location.href = "/finance";
          }, 850);
        }, 3600);
      } else {
        throw new Error("Invalid session received from server.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Invalid or expired OTP code. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 3. Password Handler: Login / Signup
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const endpoint = isSignUp ? "/api/auth/signup" : "/api/auth/login";

    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const resJson = await response.json();

      if (!response.ok) {
        const errMessage = resJson?.error?.message || resJson?.detail || "Authentication failed.";
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
        setLoadingScreenActive(true);
        setLoadingStep(0);
        setLoadingStatus("Verifying secure credentials...");
        setAuth(
          authData.access_token,
          {
            email: authData.user.email,
            id: authData.user.id,
            phone: authData.user.phone || null,
          },
          authData.refresh_token || null,
          authData.expires_at || null
        );

        // Intentionally show a 3.5-4s delay so user can read the inspiring quote & observe wave animation
        setTimeout(() => {
          setLoadingStep(1);
          setLoadingStatus("Preparing your daily financial focus...");
        }, 1200);

        setTimeout(() => {
          setLoadingStep(2);
          setLoadingStatus("Synchronizing accounts & transactions...");
        }, 2400);

        setTimeout(() => {
          setLoadingStatus("Workspace ready! Entering...");
          setIsLoginCompleted(true);
          setTimeout(() => {
            window.location.href = "/finance";
          }, 850);
        }, 3600);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Aurora background style
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

  // Cinematic loading screen during active login sequence
  if (loadingScreenActive) {
    return (
      <AuthLoadingScreen 
        statusMessage={loadingStatus} 
        isCompleted={isLoginCompleted} 
        step={loadingStep}
      />
    );
  }

  // Show cinematic loading screen until hydration completes or if already authenticated
  if (!hydrated || token) {
    return (
      <AuthLoadingScreen 
        statusMessage="Initializing Life OS..." 
      />
    );
  }

  return (
    <div
      style={backgroundStyle}
      className="min-h-screen text-white flex flex-col justify-between p-4 sm:p-6 select-none relative overflow-hidden transition-all duration-700"
    >
      {/* Top Diffuse Aurora Glow */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[850px] h-[380px] rounded-full blur-[115px] pointer-events-none transition-colors duration-700 ${
          gradientTheme === "purple" ? "bg-[#9333ea]/25" : "bg-[#2563eb]/25"
        }`}
      />

      {/* Header Bar */}
      <header className="relative z-10 flex items-center justify-between max-w-4xl w-full mx-auto pt-2 pb-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 shadow-sm">
          <Sparkles
            className={`h-4 w-4 ${
              gradientTheme === "purple" ? "text-fuchsia-300" : "text-sky-300"
            }`}
          />
          <span className="text-xs font-semibold tracking-tight text-white/90">
            Personal Finance OS
          </span>
        </div>

        {/* Aurora Variant Selector */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-black/40 backdrop-blur-xl border border-white/10">
          <button
            type="button"
            onClick={() => setGradientTheme("purple")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              gradientTheme === "purple"
                ? "bg-purple-600/80 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
            title="Purple Aurora"
          >
            <span className="w-2 h-2 rounded-full bg-purple-300" />
            <span>Purple</span>
          </button>
          <button
            type="button"
            onClick={() => setGradientTheme("blue")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              gradientTheme === "blue"
                ? "bg-blue-600/80 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
            title="Blue Aurora"
          >
            <span className="w-2 h-2 rounded-full bg-blue-300" />
            <span>Blue</span>
          </button>
        </div>
      </header>

      {/* Main Form Box */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-[420px] mx-auto z-10 flex flex-col my-auto py-6"
      >
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight drop-shadow-sm">
            {authMode === "otp"
              ? "Sign in with OTP"
              : isSignUp
              ? "Create Finance account"
              : "Sign in with Password"}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-neutral-300/80 font-normal leading-relaxed max-w-xs mx-auto">
            {authMode === "otp"
              ? "Enter your email or registered mobile number to receive a 6-digit login code."
              : "Access your accounts and live transaction ledgers."}
          </p>
        </div>

        {/* Segmented Auth Mode Switcher */}
        <div className="mb-6 p-1 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode("otp");
              setError(null);
              setSuccessMessage(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              authMode === "otp"
                ? "bg-white text-black shadow-lg"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>OTP Code</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode("password");
              setError(null);
              setSuccessMessage(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              authMode === "password"
                ? "bg-white text-black shadow-lg"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Password</span>
          </button>
        </div>

        {/* Feedback Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 bg-rose-500/15 border border-rose-500/25 text-rose-200 px-4 py-2.5 rounded-2xl text-xs font-medium flex items-center gap-2 backdrop-blur-md"
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
              className="mb-4 bg-emerald-500/15 border border-emerald-500/25 text-emerald-200 px-4 py-2.5 rounded-2xl text-xs font-medium flex items-center gap-2 backdrop-blur-md"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODE 1: OTP AUTHENTICATION */}
        {authMode === "otp" && (
          <div className="space-y-4">
            {otpStep === "identifier" ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label
                    htmlFor="otp-identifier"
                    className="block text-xs sm:text-sm font-medium text-neutral-300 mb-1.5"
                  >
                    Email or Registered Mobile Number
                  </label>
                  <input
                    id="otp-identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. name@email.com or 98765 43210"
                    className="w-full bg-[#111116]/90 backdrop-blur-md border border-white/12 hover:border-white/20 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/35 focus:bg-[#14141a] transition-all"
                  />
                  <p className="text-[11px] text-neutral-400/80 mt-1.5">
                    We'll look up your account and send a 6-digit login code.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-2xl font-semibold text-sm bg-[#BDB4FE] hover:bg-[#ABA0FD] active:scale-[0.99] text-[#121216] transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send 6-Digit OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Verification code sent for</span>
                    <strong className="text-white font-mono">{identifier}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("identifier");
                      setOtpCode("");
                      setError(null);
                    }}
                    className="text-xs text-[#BDB4FE] hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="otp-code-input"
                    className="block text-xs sm:text-sm font-medium text-neutral-300 mb-1.5 text-center"
                  >
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    id="otp-code-input"
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="w-full text-center bg-[#111116]/90 backdrop-blur-md border border-white/12 hover:border-white/20 rounded-2xl py-3.5 text-2xl font-mono tracking-[0.5em] text-white placeholder-neutral-600 focus:outline-none focus:border-white/35 focus:bg-[#14141a] transition-all font-bold"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6}
                    className="w-full py-3.5 px-4 rounded-2xl font-semibold text-sm bg-[#BDB4FE] hover:bg-[#ABA0FD] active:scale-[0.99] text-[#121216] transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify & Sign In</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Resend OTP Button */}
                <div className="text-center pt-2">
                  {countdown > 0 ? (
                    <span className="text-xs text-neutral-500 font-mono">
                      Resend code in {countdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="text-xs text-[#BDB4FE] hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Resend OTP Code</span>
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* MODE 2: PASSWORD AUTHENTICATION */}
        {authMode === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
                className="w-full bg-[#111116]/90 backdrop-blur-md border border-white/12 hover:border-white/20 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/35 focus:bg-[#14141a] transition-all"
              />
            </div>

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
                  className="w-full bg-[#111116]/90 backdrop-blur-md border border-white/12 hover:border-white/20 rounded-2xl px-4 pr-11 py-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/35 focus:bg-[#14141a] transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl font-semibold text-sm bg-[#BDB4FE] hover:bg-[#ABA0FD] active:scale-[0.99] text-[#121216] transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
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

            <div className="pt-2 text-center">
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
          </form>
        )}

        {/* Privacy Policy Footer */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-neutral-400/80">
            By continuing, you agree to our{" "}
            <a href="#" className="underline text-neutral-300 hover:text-white transition-colors">
              Privacy Policy
            </a>
          </p>
        </div>
      </motion.div>

      {/* Footer Bottom Bar */}
      <footer className="relative z-10 text-center text-[11px] text-neutral-400/60 max-w-4xl w-full mx-auto pb-2">
        <span>Personal Finance Tracker · Production Grade · 2026</span>
      </footer>
    </div>
  );
}
