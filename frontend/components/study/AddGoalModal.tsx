"use client";

import React, { useState } from "react";
import { X, Target, Calendar } from "lucide-react";
import { useStudyGoals } from "@/hooks/useStudyLogs";
import type { GoalStatus } from "@/types/study";

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMonth?: string;
}

export default function AddGoalModal({ isOpen, onClose, defaultMonth }: AddGoalModalProps) {
  const currentMonthStart = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  })();

  const [month, setMonth] = useState(defaultMonth || currentMonthStart);
  const [goalText, setGoalText] = useState("");
  const [status, setStatus] = useState<GoalStatus>("not_started");
  const [error, setError] = useState<string | null>(null);

  const { createGoal, isCreating } = useStudyGoals();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!goalText.trim()) {
      setError("Please describe your goal.");
      return;
    }

    try {
      await createGoal({
        month: month.endsWith("-01") ? month : `${month.slice(0, 7)}-01`,
        goal_text: goalText.trim(),
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create study goal.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-raised/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent/15 text-accent">
              <Target className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-text-primary">Set Monthly Goal</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/25 text-danger rounded-lg text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-text-muted" />
              Target Month
            </label>
            <input
              type="month"
              value={month.slice(0, 7)}
              onChange={(e) => setMonth(`${e.target.value}-01`)}
              required
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary">
              Goal Description
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Complete Chapters 1-8 of Designing Data-Intensive Applications"
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              required
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent resize-none placeholder:text-text-muted/60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary">
              Initial Status
            </label>
            <div className="flex gap-2">
              {(["not_started", "in_progress", "done"] as GoalStatus[]).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono capitalize transition-all ${
                    status === s
                      ? "bg-accent/20 text-accent border border-accent/40 font-semibold"
                      : "bg-surface-raised border border-border text-text-muted hover:text-text-primary"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface-raised hover:bg-surface-raised/80 text-text-secondary hover:text-text-primary border border-border rounded-lg text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
            >
              {isCreating ? "Saving..." : "Create Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
