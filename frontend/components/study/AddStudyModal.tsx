"use client";

import React, { useState } from "react";
import { X, BookOpen, Clock, Calendar, FileText } from "lucide-react";
import { useStudyLogs } from "@/hooks/useStudyLogs";

interface AddStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
}

export default function AddStudyModal({ isOpen, onClose, defaultDate }: AddStudyModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [studyDate, setStudyDate] = useState(defaultDate || today);
  const [topic, setTopic] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { createLog, isCreating } = useStudyLogs();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!topic.trim()) {
      setError("Please enter what topic or subject you studied.");
      return;
    }

    try {
      await createLog({
        study_date: studyDate,
        topic: topic.trim(),
        minutes: minutes ? parseInt(minutes, 10) : undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to log study session.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-raised/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent/15 text-accent">
              <BookOpen className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-text-primary">Log Study Session</h2>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-text-muted" />
                Date
              </label>
              <input
                type="date"
                value={studyDate}
                onChange={(e) => setStudyDate(e.target.value)}
                required
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-text-muted" />
                Duration (minutes)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                placeholder="e.g. 45"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                required
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary">
              Topic / Subject
            </label>
            <input
              type="text"
              placeholder="e.g. System Design: Redis caching strategies, Delta Lake ACID"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-text-muted" />
              Notes / Takeaways (optional)
            </label>
            <textarea
              rows={3}
              placeholder="Key concepts, breakthroughs, or questions to revisit..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs font-sans text-text-primary focus:outline-none focus:border-accent resize-none placeholder:text-text-muted/60"
            />
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
              {isCreating ? "Saving..." : "Log Study Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
