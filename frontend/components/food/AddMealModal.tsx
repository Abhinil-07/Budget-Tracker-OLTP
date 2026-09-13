"use client";

import React, { useState } from "react";
import { X, UtensilsCrossed, Calendar, Tag, FileText } from "lucide-react";
import { useMealLogs } from "@/hooks/useMealLogs";
import type { MealSlot } from "@/types/food";

interface AddMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultSlot?: MealSlot;
}

const MEAL_SLOTS: { slot: MealSlot; label: string }[] = [
  { slot: "breakfast", label: "Breakfast" },
  { slot: "lunch", label: "Lunch" },
  { slot: "dinner", label: "Dinner" },
  { slot: "snack", label: "Snack" },
];

const TAG_OPTIONS = ["home", "outside", "healthy", "junk"];

export default function AddMealModal({
  isOpen,
  onClose,
  defaultDate,
  defaultSlot,
}: AddMealModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [mealDate, setMealDate] = useState(defaultDate || today);
  const [mealSlot, setMealSlot] = useState<MealSlot>(defaultSlot || "lunch");
  const [whatIAte, setWhatIAte] = useState("");
  const [tag, setTag] = useState<string>("home");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { createMeal, isCreating } = useMealLogs();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!whatIAte.trim()) {
      setError("Please describe what you ate.");
      return;
    }

    try {
      await createMeal({
        meal_date: mealDate,
        meal_slot: mealSlot,
        what_i_ate: whatIAte.trim(),
        tag: tag || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to log meal.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-raised/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent/15 text-accent">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-text-primary">Log Meal</h2>
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

          {/* Date & Slot selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-text-muted" />
                Date
              </label>
              <input
                type="date"
                value={mealDate}
                onChange={(e) => setMealDate(e.target.value)}
                required
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-text-secondary">
                Meal Slot
              </label>
              <select
                value={mealSlot}
                onChange={(e) => setMealSlot(e.target.value as MealSlot)}
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent cursor-pointer"
              >
                {MEAL_SLOTS.map((s) => (
                  <option key={s.slot} value={s.slot}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Slot Buttons */}
          <div className="flex gap-1.5">
            {MEAL_SLOTS.map((s) => (
              <button
                type="button"
                key={s.slot}
                onClick={() => setMealSlot(s.slot)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  mealSlot === s.slot
                    ? "bg-accent/20 text-accent border border-accent/40 font-semibold"
                    : "bg-surface-raised border border-border text-text-muted hover:text-text-primary"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* What I Ate Free Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center justify-between">
              <span>What did you eat?</span>
              <span className="text-[10px] text-text-muted">Free-text</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. 2 Rotis with Dal, Paneer Bhurji and salad"
              value={whatIAte}
              onChange={(e) => setWhatIAte(e.target.value)}
              required
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs font-sans text-text-primary focus:outline-none focus:border-accent resize-none placeholder:text-text-muted/60"
            />
          </div>

          {/* Tag Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-text-muted" />
              Tag
            </label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTag(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-all ${
                    tag === t
                      ? "bg-accent/20 text-accent border border-accent/40 font-semibold"
                      : "bg-surface-raised border border-border text-text-muted hover:text-text-primary"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-text-muted" />
              Notes (optional)
            </label>
            <input
              type="text"
              placeholder="Felt light, skipped sugar..."
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
              {isCreating ? "Saving..." : "Log Meal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
