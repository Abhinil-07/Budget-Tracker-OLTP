"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

interface SyncStatusBadgeProps {
  className?: string;
}

export default function SyncStatusBadge({ className = "" }: SyncStatusBadgeProps) {
  const { data: syncData } = useQuery({
    queryKey: ["sync-status"],
    queryFn: () => api.sync.status(),
    refetchInterval: 60 * 1000, // Poll every 60 seconds
  });

  const lastSync = syncData?.data;

  let dotColor = "bg-text-muted";
  let label = "No Sync";

  if (lastSync) {
    if (lastSync.status === "success") {
      dotColor = "bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]";
      label = "Sync OK";
    } else if (lastSync.status === "failed") {
      dotColor = "bg-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]";
      label = "Sync Failed";
    } else if (lastSync.status === "in_progress") {
      return (
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1510] border border-warning/20 text-xs font-mono text-warning select-none ${className}`}
          title="Weekly sync to Databricks is currently running"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-warning"></span>
          </span>
          <span className="animate-pulse">Syncing...</span>
        </div>
      );
    }
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-raised border border-border text-xs font-mono text-text-secondary select-none ${className}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <span>{label}</span>
    </div>
  );
}
