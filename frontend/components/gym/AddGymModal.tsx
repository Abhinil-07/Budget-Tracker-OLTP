"use client";

import React, { useState } from "react";
import { X, Dumbbell, Clock, Calendar, FileText } from "lucide-react";
import { useGymSessions } from "@/hooks/useGymSessions";

interface AddGymModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
}

const SPLIT_OPTIONS = ["Push", "Pull", "Legs", "Upper", "Lower", "Full Body", "Cardio", "Core"];

export default function AddGymModal({ isOpen, onClose, defaultDate }: AddGymModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [sessionDate, setSessionDate] = useState(defaultDate || today);
  const [splitType, setSplitType] = useState("Push");
  const [customSplit, setCustomSplit] = useState("");
  const [exercises, setExercises] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { createSession, isCreating } = useGymSessions();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const chosenSplit = splitType === "Custom" ? customSplit.trim() : splitType;
    if (!chosenSplit) {
      setError("Please select or enter a workout split.");
      return;
    }

    try {
      await createSession({
        session_date: sessionDate,
        split_type: chosenSplit,
        exercises: exercises.trim() || undefined,
        duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to log workout session.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-raised/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent/15 text-accent">
              <Dumbbell className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-text-primary">Log Workout Session</h2>
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

          {/* Date & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-text-muted" />
                Date
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-text-muted" />
                Duration (mins)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                placeholder="e.g. 60"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Split Type Chips */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary">
              Split / Workout Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SPLIT_OPTIONS.map((split) => (
                <button
                  type="button"
                  key={split}
                  onClick={() => setSplitType(split)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    splitType === split
                      ? "bg-accent/20 text-accent border border-accent/40 font-semibold"
                      : "bg-surface-raised border border-border text-text-muted hover:text-text-primary"
                  }`}
                >
                  {split}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSplitType("Custom")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  splitType === "Custom"
                    ? "bg-accent/20 text-accent border border-accent/40 font-semibold"
                    : "bg-surface-raised border border-border text-text-muted hover:text-text-primary"
                }`}
              >
                Custom...
              </button>
            </div>
            {splitType === "Custom" && (
              <input
                type="text"
                placeholder="Enter custom split (e.g. Swimming, Calisthenics)"
                value={customSplit}
                onChange={(e) => setCustomSplit(e.target.value)}
                className="w-full mt-2 bg-surface-raised border border-accent/40 rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none"
                autoFocus
              />
            )}
          </div>

          {/* Exercises free text */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center justify-between">
              <span>Exercises (sets × reps, weight)</span>
              <span className="text-[10px] text-text-muted">Free-text</span>
            </label>
            <textarea
              rows={4}
              placeholder={"Bench Press: 3x10 (80kg)\nIncline DB Press: 3x12 (26kg)\nTricep Pushdowns: 4x15 (30kg)"}
              value={exercises}
              onChange={(e) => setExercises(e.target.value)}
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent resize-none placeholder:text-text-muted/60"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-text-muted" />
              Notes (optional)
            </label>
            <input
              type="text"
              placeholder="Felt great, increased incline press weight..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          {/* Action Buttons */}
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
              {isCreating ? "Saving..." : "Log Workout"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
