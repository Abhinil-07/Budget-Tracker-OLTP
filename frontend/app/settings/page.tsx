"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { useSyncStatus } from "../../hooks/useSyncStatus";
import PageWrapper from "../../components/layout/PageWrapper";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/formatDate";
import { RefreshCw, LogOut, CheckCircle, AlertCircle, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { token, user, hydrated, hydrate, logout } = useAuthStore();
  const [syncLoading, setSyncLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Redirect if not logged in
  useEffect(() => {
    if (hydrated && !token) {
      window.location.href = "/login";
    }
  }, [hydrated, token]);

  // Fetch sync status using React Query
  const { data: lastSync, isLoading: syncStatusLoading } = useSyncStatus();

  // Cooldown check (6 hours)
  const isCooldownActive = React.useMemo(() => {
    if (!lastSync) return false;
    const lastTime = new Date(lastSync.triggered_at).getTime();
    const sixHours = 6 * 60 * 60 * 1000;
    return Date.now() - lastTime < sixHours;
  }, [lastSync]);

  const handleTriggerSync = async () => {
    setSyncLoading(true);
    setMessage(null);
    try {
      const response = await api.sync.trigger();
      if (response.error) {
        throw new Error(response.error.message);
      }
      setMessage({ type: "success", text: "Weekly CSV sync triggered successfully in background." });
      // Invalidate query cache to pull the new log status
      queryClient.invalidateQueries({ queryKey: ["sync-status"] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to trigger sync.";
      setMessage({ type: "error", text: message });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const isLocalDev =
      !supabaseAnonKey ||
      supabaseAnonKey === "your-anon-key-here" ||
      supabaseAnonKey.trim() === "";

    if (!isLocalDev && token) {
      try {
        await fetch(`${supabaseUrl}/auth/v1/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey || "",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error("Supabase signOut error:", err);
      }
    }

    logout();
    window.location.href = "/login";
  };

  if (!hydrated || !token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent border-r-2" />
      </div>
    );
  }

  return (
    <PageWrapper title="Settings">
      {/* Session Profile */}
      <div className="bg-surface p-6 rounded-xl border border-border space-y-4">
        <h3 className="font-semibold text-text-primary text-base flex items-center gap-2">
          <Shield className="h-5 w-5 text-accent" />
          <span>User Session Profile</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
          <div className="bg-surface-raised p-4 rounded border border-border">
            <span className="text-text-muted block text-xs uppercase mb-1">Email address</span>
            <span className="text-text-primary text-sm">{user?.email || "Unknown"}</span>
          </div>
          <div className="bg-surface-raised p-4 rounded border border-border">
            <span className="text-text-muted block text-xs uppercase mb-1">User Identifier (UID)</span>
            <span className="text-text-primary text-xs break-all">{user?.id || "None"}</span>
          </div>
        </div>
      </div>

      {/* Sync Control */}
      <div className="bg-surface p-6 rounded-xl border border-border space-y-6">
        <div>
          <h3 className="font-semibold text-text-primary text-base">Databricks Analytics Sync</h3>
          <p className="text-sm text-text-secondary mt-1">
            Weekly CSV extraction and upload to the Databricks Unity Catalog Volume.
          </p>
        </div>

        {/* Sync Status Cards */}
        {syncStatusLoading ? (
          <div className="h-16 bg-surface-raised rounded border border-border animate-pulse" />
        ) : lastSync ? (
          <div className={`p-4 rounded-lg border flex items-start gap-3 ${
            lastSync.status === "success"
              ? "bg-success/5 border-success/20 text-success"
              : lastSync.status === "failed"
              ? "bg-danger/5 border-danger/20 text-danger"
              : "bg-warning/5 border-warning/20 text-warning"
          }`}>
            {lastSync.status === "success" ? (
              <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            )}
            <div className="text-sm font-mono">
              <div className="font-semibold">
                Status: {lastSync.status === "success" ? "Success" : lastSync.status === "failed" ? "Failed" : "Syncing..."}
              </div>
              <div className="text-xs text-text-secondary mt-1">
                Last Triggered: {formatDate(lastSync.triggered_at, true)} ({lastSync.trigger_type})
              </div>
              {lastSync.rows_exported !== undefined && (
                <div className="text-xs text-text-secondary">
                  Rows Exported: {lastSync.rows_exported}
                </div>
              )}
              {lastSync.error_message && (
                <div className="text-xs text-danger/80 mt-2 bg-danger/10 p-2 rounded border border-danger/10 max-h-24 overflow-y-auto">
                  {lastSync.error_message}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-surface-raised rounded border border-border text-sm text-text-secondary font-mono">
            No sync execution history found.
          </div>
        )}

        {message && (
          <div className={`text-sm p-4 rounded-lg border ${
            message.type === "success"
              ? "bg-success/10 border-success/20 text-success"
              : "bg-danger/10 border-danger/20 text-danger"
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleTriggerSync}
            disabled={syncLoading || isCooldownActive}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-text-primary rounded-lg text-sm font-semibold transition-all duration-150 shadow-lg shadow-accent/15"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${syncLoading ? "animate-spin" : ""}`} />
            <span>{syncLoading ? "Running Sync..." : isCooldownActive ? "Sync Cooldown Active" : "Run Sync Now"}</span>
          </button>

          {isCooldownActive && (
            <div className="text-xs text-text-muted self-center font-mono">
              (Rate limited: runs once every 6 hours)
            </div>
          )}
        </div>
      </div>

      {/* Logout Settings */}
      <div className="bg-surface p-6 rounded-xl border border-border space-y-4">
        <div>
          <h3 className="font-semibold text-text-primary text-base">Sign Out</h3>
          <p className="text-sm text-text-secondary mt-1">
            Terminate your session and clear local security tokens.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 bg-danger/10 border border-danger/20 hover:bg-danger/20 text-danger rounded-lg text-sm font-semibold transition-all duration-150"
        >
          <LogOut className="h-4.5 w-4.5" />
          <span>Logout Session</span>
        </button>
      </div>
    </PageWrapper>
  );
}
