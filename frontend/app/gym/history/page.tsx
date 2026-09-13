"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import PageWrapper from "@/components/layout/PageWrapper";
import AddGymModal from "@/components/gym/AddGymModal";
import WorkoutSessionCard from "@/components/gym/WorkoutSessionCard";
import { useGymSessions } from "@/hooks/useGymSessions";
import { Filter } from "lucide-react";

export default function GymHistoryPage() {
  const { token, hydrated, hydrate } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [splitFilter, setSplitFilter] = useState("all");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !token) {
      window.location.href = "/login";
    }
  }, [hydrated, token]);

  const { sessions, isLoading, deleteSession } = useGymSessions();

  // Extract unique split types
  const splitTypes = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => {
      if (s.split_type) set.add(s.split_type);
    });
    return Array.from(set);
  }, [sessions]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    if (splitFilter === "all") return sessions;
    return sessions.filter((s) => s.split_type === splitFilter);
  }, [sessions, splitFilter]);

  return (
    <PageWrapper
      title="Workout History"
      onAddTransactionClick={() => setShowAddModal(true)}
      actionLabel="Log Workout"
    >
      <AddGymModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

      {/* Filter toolbar */}
      <div className="p-4 bg-surface border border-border rounded-xl flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-muted" />
          <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">Filter by Split:</span>
          <select
            value={splitFilter}
            onChange={(e) => setSplitFilter(e.target.value)}
            className="bg-surface-raised border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-text-primary focus:outline-none focus:border-accent cursor-pointer"
          >
            <option value="all">All Splits ({sessions.length})</option>
            {splitTypes.map((split) => (
              <option key={split} value={split}>
                {split}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-mono text-text-muted">
          Showing {filteredSessions.length} session{filteredSessions.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Full Sessions Card List */}
      <div>
        {isLoading ? (
          <div className="p-12 text-center text-xs font-mono text-text-muted animate-pulse bg-surface border border-border rounded-xl">
            Loading workout history...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-16 text-center text-text-secondary text-sm bg-surface border border-border rounded-xl">
            No workouts found for the selected filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <WorkoutSessionCard
                key={session.id}
                session={session}
                onDelete={deleteSession}
              />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
