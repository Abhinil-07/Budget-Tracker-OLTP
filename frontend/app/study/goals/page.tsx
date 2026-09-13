"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import PageWrapper from "@/components/layout/PageWrapper";
import AddGoalModal from "@/components/study/AddGoalModal";
import { useStudyGoals } from "@/hooks/useStudyLogs";
import type { GoalStatus } from "@/types/study";
import { Target, CheckCircle2, Circle, Clock3, Trash2, Calendar, Plus } from "lucide-react";

export default function StudyGoalsPage() {
  const { token, hydrated, hydrate } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !token) {
      window.location.href = "/login";
    }
  }, [hydrated, token]);

  const { goals, isLoading, updateGoal, deleteGoal } = useStudyGoals();

  const filteredGoals = useMemo(() => {
    return goals.filter((g) => g.month.startsWith(selectedMonth));
  }, [goals, selectedMonth]);

  const toggleStatus = async (id: string, current: string) => {
    const next: GoalStatus =
      current === "not_started"
        ? "in_progress"
        : current === "in_progress"
        ? "done"
        : "not_started";
    await updateGoal({ id, dto: { status: next } });
  };

  const doneCount = filteredGoals.filter((g) => g.status === "done").length;

  return (
    <PageWrapper
      title="Monthly Study Goals"
      onAddTransactionClick={() => setShowAddModal(true)}
      actionLabel="Add Goal"
    >
      <AddGoalModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        defaultMonth={`${selectedMonth}-01`}
      />

      {/* Month Toolbar */}
      <div className="p-4 bg-surface border border-border rounded-xl flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-text-muted" />
          <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">Month:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-surface-raised border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent cursor-pointer"
          />
        </div>

        <div className="text-xs font-mono text-text-muted">
          {doneCount} of {filteredGoals.length} completed
        </div>
      </div>

      {/* Goals Card List */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">
            Goals for {selectedMonth}
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Goal</span>
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs font-mono text-text-muted animate-pulse">
            Loading goals...
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="p-16 text-center text-text-secondary text-sm flex flex-col items-center justify-center gap-3">
            <Target className="h-8 w-8 text-text-muted" />
            <p className="text-sm">No goals set for this month</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
            >
              Set First Goal
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredGoals.map((goal) => (
              <div
                key={goal.id}
                className="p-5 hover:bg-surface-raised/40 transition-colors flex items-center justify-between gap-4 group"
              >
                <div
                  onClick={() => toggleStatus(goal.id, goal.status)}
                  className="flex items-center gap-3 flex-1 cursor-pointer select-none"
                >
                  {goal.status === "done" ? (
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                  ) : goal.status === "in_progress" ? (
                    <Clock3 className="h-5 w-5 text-accent shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-text-muted shrink-0" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      goal.status === "done"
                        ? "line-through text-text-muted"
                        : "text-text-primary"
                    }`}
                  >
                    {goal.goal_text}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    onClick={() => toggleStatus(goal.id, goal.status)}
                    className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded capitalize cursor-pointer ${
                      goal.status === "done"
                        ? "bg-success/15 text-success border border-success/30"
                        : goal.status === "in_progress"
                        ? "bg-accent/15 text-accent border border-accent/30"
                        : "bg-surface-raised text-text-muted border border-border"
                    }`}
                  >
                    {goal.status.replace("_", " ")}
                  </span>
                  <button
                    onClick={() => {
                      if (confirm("Delete this goal?")) {
                        deleteGoal(goal.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-all"
                    title="Delete Goal"
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
