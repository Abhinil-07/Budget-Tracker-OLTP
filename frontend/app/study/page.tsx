"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import PageWrapper from "@/components/layout/PageWrapper";
import AddStudyModal from "@/components/study/AddStudyModal";
import AddGoalModal from "@/components/study/AddGoalModal";
import { useStudyLogs, useStudyGoals } from "@/hooks/useStudyLogs";
import { BookOpen, Clock, Target, Calendar, Trash2, CheckCircle2, Circle, Clock3 } from "lucide-react";
import Link from "next/link";

export default function StudyPage() {
  const { token, hydrated, hydrate } = useAuthStore();
  const [showStudyModal, setShowStudyModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !token) {
      window.location.href = "/login";
    }
  }, [hydrated, token]);

  const { logs, isLoading: logsLoading, deleteLog } = useStudyLogs();
  const { goals, isLoading: goalsLoading, updateGoal } = useStudyGoals();

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Today's total study minutes
  const todayMinutes = useMemo(() => {
    return logs
      .filter((l) => l.study_date === today)
      .reduce((sum, l) => sum + (l.minutes || 0), 0);
  }, [logs, today]);

  // Last 7 days minutes
  const past7DaysMinutes = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const threshold = d.toISOString().split("T")[0];
    return logs
      .filter((l) => l.study_date >= threshold)
      .reduce((sum, l) => sum + (l.minutes || 0), 0);
  }, [logs]);

  // This month minutes
  const thisMonthMinutes = useMemo(() => {
    const currentYearMonth = today.slice(0, 7);
    return logs
      .filter((l) => l.study_date.startsWith(currentYearMonth))
      .reduce((sum, l) => sum + (l.minutes || 0), 0);
  }, [logs, today]);

  // Active goals for this month
  const activeGoals = useMemo(() => {
    const currentYearMonth = today.slice(0, 7);
    return goals.filter((g) => g.month.startsWith(currentYearMonth));
  }, [goals, today]);

  const toggleGoalStatus = async (goalId: string, currentStatus: string) => {
    const nextStatus =
      currentStatus === "not_started"
        ? "in_progress"
        : currentStatus === "in_progress"
        ? "done"
        : "not_started";
    await updateGoal({ id: goalId, dto: { status: nextStatus as any } });
  };

  return (
    <PageWrapper
      title="Study & Goals"
      onAddTransactionClick={() => setShowStudyModal(true)}
      actionLabel="Log Study"
    >
      <AddStudyModal isOpen={showStudyModal} onClose={() => setShowStudyModal(false)} />
      <AddGoalModal isOpen={showGoalModal} onClose={() => setShowGoalModal(false)} />

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Minutes */}
        <div className="bg-surface border border-border p-5 rounded-xl">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-text-muted">
            <span>Today's Study</span>
            <Clock className="h-4 w-4 text-accent" />
          </div>
          <div className="mt-3 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold text-text-primary">{todayMinutes}</span>
            <span className="text-xs text-text-muted">minutes</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            {todayMinutes >= 60 ? "Solid focus today!" : "Keep the momentum going"}
          </p>
        </div>

        {/* Past 7 Days Hours */}
        <div className="bg-surface border border-border p-5 rounded-xl">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-text-muted">
            <span>Last 7 Days</span>
            <BookOpen className="h-4 w-4 text-text-muted" />
          </div>
          <div className="mt-3 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold text-text-primary">
              {(past7DaysMinutes / 60).toFixed(1)}
            </span>
            <span className="text-xs text-text-muted">hours</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">Weekly total focus time</p>
        </div>

        {/* This Month Total */}
        <div className="bg-surface border border-border p-5 rounded-xl">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-text-muted">
            <span>This Month</span>
            <Calendar className="h-4 w-4 text-accent" />
          </div>
          <div className="mt-3 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold text-accent">
              {(thisMonthMinutes / 60).toFixed(1)}
            </span>
            <span className="text-xs text-text-muted">hours total</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            {activeGoals.length} monthly goal{activeGoals.length === 1 ? "" : "s"} tracked
          </p>
        </div>
      </div>

      {/* Monthly Goals Preview Card */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-text-primary">Active Monthly Goals</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGoalModal(true)}
              className="text-xs font-mono text-accent hover:underline"
            >
              + New Goal
            </button>
            <Link
              href="/study/goals"
              className="text-xs font-mono text-text-secondary hover:text-text-primary"
            >
              All Goals →
            </Link>
          </div>
        </div>

        {activeGoals.length === 0 ? (
          <p className="text-xs text-text-muted italic py-1">
            No goals set for this month yet. Click "+ New Goal" to set one.
          </p>
        ) : (
          <div className="space-y-2">
            {activeGoals.map((goal) => (
              <div
                key={goal.id}
                onClick={() => toggleGoalStatus(goal.id, goal.status)}
                className="p-3 bg-surface-raised/40 hover:bg-surface-raised border border-border/40 rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-colors"
                title="Click to toggle status"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {goal.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : goal.status === "in_progress" ? (
                    <Clock3 className="h-4 w-4 text-accent shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-text-muted shrink-0" />
                  )}
                  <span
                    className={`text-xs font-medium truncate ${
                      goal.status === "done"
                        ? "line-through text-text-muted"
                        : "text-text-primary"
                    }`}
                  >
                    {goal.goal_text}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded capitalize shrink-0 ${
                    goal.status === "done"
                      ? "bg-success/15 text-success border border-success/30"
                      : goal.status === "in_progress"
                      ? "bg-accent/15 text-accent border border-accent/30"
                      : "bg-surface-raised text-text-muted border border-border"
                  }`}
                >
                  {goal.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Study Sessions */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Study Log Timeline</h2>
            <p className="text-xs text-text-muted mt-0.5 font-mono">
              Recent study topics, time spent, and learning notes
            </p>
          </div>
        </div>

        {logsLoading ? (
          <div className="p-8 text-center text-xs font-mono text-text-muted animate-pulse">
            Loading study logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-text-secondary text-sm flex flex-col items-center justify-center gap-3">
            <BookOpen className="h-8 w-8 text-text-muted" />
            <p className="text-sm">No study sessions logged yet</p>
            <button
              onClick={() => setShowStudyModal(true)}
              className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Log First Session</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-5 hover:bg-surface-raised/40 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4 group"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-text-muted flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {log.study_date}
                    </span>
                    {log.minutes && (
                      <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {log.minutes}m
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-text-primary">{log.topic}</p>

                  {log.notes && (
                    <div className="text-xs font-sans text-text-secondary bg-surface-raised/50 p-3 rounded-lg border border-border/50 max-w-2xl whitespace-pre-line leading-relaxed">
                      {log.notes}
                    </div>
                  )}
                </div>

                <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      if (confirm("Delete this study session?")) {
                        deleteLog(log.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                    title="Delete Entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
