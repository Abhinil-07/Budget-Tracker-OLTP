"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import PageWrapper from "@/components/layout/PageWrapper";
import AddGymModal from "@/components/gym/AddGymModal";
import WorkoutSessionCard from "@/components/gym/WorkoutSessionCard";
import { useGymSessions } from "@/hooks/useGymSessions";
import { Dumbbell, Calendar, Plus, Flame, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function GymPage() {
  const { token, hydrated, hydrate } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !token) {
      window.location.href = "/login";
    }
  }, [hydrated, token]);

  const { sessions, isLoading, deleteSession } = useGymSessions();

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Check if workout logged today
  const todaysWorkout = useMemo(() => {
    return sessions.find((s) => s.session_date === today);
  }, [sessions, today]);

  // Total sessions this month
  const thisMonthCount = useMemo(() => {
    const currentYearMonth = today.slice(0, 7);
    return sessions.filter((s) => s.session_date.startsWith(currentYearMonth)).length;
  }, [sessions, today]);

  // Total sessions past 7 days
  const past7DaysCount = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const threshold = d.toISOString().split("T")[0];
    return sessions.filter((s) => s.session_date >= threshold).length;
  }, [sessions]);

  return (
    <PageWrapper
      title="Gym & Workout Log"
      onAddTransactionClick={() => setShowAddModal(true)}
      actionLabel="Log Workout"
    >
      <AddGymModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

      {/* Top Banner / Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Status */}
        <div className="bg-surface border border-border p-5 rounded-xl">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-text-muted">
            <span>Today's Status</span>
            <Dumbbell className="h-4 w-4 text-accent" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            {todaysWorkout ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-base font-semibold text-text-primary">
                  {todaysWorkout.split_type} Completed
                </span>
              </>
            ) : (
              <span className="text-sm text-text-secondary">No workout logged yet today</span>
            )}
          </div>
          {todaysWorkout?.duration_minutes && (
            <p className="text-xs font-mono text-text-muted mt-1">
              {todaysWorkout.duration_minutes} minutes logged
            </p>
          )}
        </div>

        {/* Weekly Consistency */}
        <div className="bg-surface border border-border p-5 rounded-xl">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-text-muted">
            <span>Last 7 Days</span>
            <Flame className="h-4 w-4 text-accent" />
          </div>
          <div className="mt-3 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold text-text-primary">{past7DaysCount}</span>
            <span className="text-xs text-text-muted">sessions</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            {past7DaysCount >= 4 ? "High consistency!" : "Target: 4-5 sessions"}
          </p>
        </div>

        {/* Monthly Total */}
        <div className="bg-surface border border-border p-5 rounded-xl">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-text-muted">
            <span>This Month</span>
            <Calendar className="h-4 w-4 text-text-muted" />
          </div>
          <div className="mt-3 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold text-accent">{thisMonthCount}</span>
            <span className="text-xs text-text-muted">workouts</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">Keep the streak going</p>
        </div>
      </div>

      {/* Main Sessions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Recent Workout Logs</h2>
            <p className="text-xs text-text-muted mt-0.5 font-mono">
              Quick review of your latest exercises and sets
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/gym/history"
              className="text-xs font-mono text-accent hover:underline"
            >
              View Full History →
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-text-muted animate-pulse bg-surface border border-border rounded-xl">
            Loading workout logs...
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center text-text-secondary text-sm flex flex-col items-center justify-center gap-3 bg-surface border border-border rounded-xl">
            <Dumbbell className="h-8 w-8 text-text-muted" />
            <p className="text-sm">No workout sessions logged yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log First Workout</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.slice(0, 10).map((session) => (
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
