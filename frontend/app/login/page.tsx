"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { Activity } from "lucide-react";

export default function LoginPage() {
  const { token, hydrated, hydrate, setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // If already logged in, go to dashboard
  useEffect(() => {
    if (hydrated && token) {
      window.location.href = "/";
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
        window.location.href = "/";
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Show spinner until hydration completes
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent border-r-2" />
      </div>
    );
  }

  // If already logged in, show nothing (redirect is happening)
  if (token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent border-r-2" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-accent/15 rounded-2xl border border-accent/20">
            <Activity className="h-10 w-10 text-accent" />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-text-primary tracking-tight">
          Finance Command Center
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {isSignUp ? "Register a new profile to get started" : "Enter credentials to authorize access"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-4 border border-border sm:rounded-xl sm:px-10 shadow-2xl">
          {error && (
            <div className="mb-4 bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg text-sm font-mono">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 bg-success/10 border border-success/25 text-success px-4 py-3 rounded-lg text-sm font-mono">
              {successMessage}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary">
                Email address
              </label>
              <div className="mt-1.5">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3.5 py-2 bg-surface-raised border border-border rounded-lg placeholder-text-muted text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sm transition-all duration-155"
                  placeholder="name@domain.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
                Password
              </label>
              <div className="mt-1.5">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3.5 py-2 bg-surface-raised border border-border rounded-lg placeholder-text-muted text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sm transition-all duration-155"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-text-primary bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all duration-155 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-accent/20"
              >
                {loading ? (isSignUp ? "Registering..." : "Authenticating...") : (isSignUp ? "Sign Up" : "Sign In")}
              </button>
            </div>
          </form>

          <div className="mt-6 flex flex-col items-center justify-center text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-xs text-accent hover:underline font-semibold"
            >
              {isSignUp ? "Already have an account? Sign In" : "Need an account? Create one"}
            </button>
            <span className="text-[9px] uppercase font-mono tracking-widest text-text-muted mt-4 block">
              🔒 SECURED BY SUPABASE SHIELD
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
