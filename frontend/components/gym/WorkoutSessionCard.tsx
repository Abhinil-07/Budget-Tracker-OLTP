"use client";

import React, { useMemo } from "react";
import type { GymSession } from "@/types/gym";
import {
  Calendar,
  Clock,
  Trash2,
  Dumbbell,
  Activity,
  Footprints,
} from "lucide-react";

interface WorkoutSessionCardProps {
  session: GymSession;
  onDelete?: (id: string) => void;
}

interface ParsedExercise {
  name: string;
  details?: string;
  isCardio?: boolean;
}

function parseExerciseLines(text?: string | null): ParsedExercise[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      let name = line;
      let details: string | undefined = undefined;

      if (line.includes(" : ")) {
        const [n, ...rest] = line.split(" : ");
        name = n.trim();
        details = rest.join(" : ").trim();
      } else if (line.includes(":")) {
        const [n, ...rest] = line.split(":");
        name = n.trim();
        details = rest.join(":").trim();
      } else if (line.includes(" - ")) {
        const [n, ...rest] = line.split(" - ");
        name = n.trim();
        details = rest.join(" - ").trim();
      }

      // Regex fallback if no delimiter was used (e.g. "Lat Pulldown 4 sets" or "Incline Press (3x10)")
      if (!details) {
        const parenMatch = name.match(/^(.*?)\s*\((.*?)\)$/);
        if (parenMatch) {
          name = parenMatch[1].trim();
          details = parenMatch[2].trim();
        } else {
          const setMatch = name.match(/^(.*?)\s+(\d+\s*(?:sets?|reps?|mins?|[xX]\s*\d+).*)$/i);
          if (setMatch) {
            name = setMatch[1].trim();
            details = setMatch[2].trim();
          }
        }
      }

      const lowerName = name.toLowerCase();
      const isCardio =
        lowerName.includes("walk") ||
        lowerName.includes("run") ||
        lowerName.includes("treadmill") ||
        lowerName.includes("cycle") ||
        lowerName.includes("cardio") ||
        lowerName.includes("swim");

      return { name, details, isCardio };
    });
}

function getSplitBadgeStyle(split?: string | null) {
  const s = (split || "").toLowerCase();
  if (s.includes("pull")) {
    return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
  }
  if (s.includes("push")) {
    return "bg-accent/15 text-accent border-accent/30";
  }
  if (s.includes("leg")) {
    return "bg-violet-500/10 text-violet-400 border-violet-500/30";
  }
  if (s.includes("cardio") || s.includes("run")) {
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  }
  if (s.includes("upper") || s.includes("lower")) {
    return "bg-blue-500/10 text-blue-400 border-blue-500/30";
  }
  return "bg-amber-500/10 text-amber-400 border-amber-500/30";
}

function formatSessionDate(dateStr: string) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split("T")[0];

    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";

    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function WorkoutSessionCard({ session, onDelete }: WorkoutSessionCardProps) {
  const exercises = useMemo(
    () => parseExerciseLines(session.exercises),
    [session.exercises]
  );
  const splitStyle = useMemo(
    () => getSplitBadgeStyle(session.split_type),
    [session.split_type]
  );
  const formattedDate = useMemo(
    () => formatSessionDate(session.session_date),
    [session.session_date]
  );

  return (
    <div className="bg-surface border border-border/80 rounded-xl p-5 hover:border-border transition-all duration-150 group shadow-sm">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Split Tag */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold tracking-wide border uppercase ${splitStyle}`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>{session.split_type || "Workout"}</span>
          </span>

          {/* Date */}
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-text-secondary bg-surface-raised/60 px-2.5 py-1 rounded-md border border-border/50">
            <Calendar className="h-3.5 w-3.5 text-text-muted" />
            <span>{formattedDate}</span>
          </span>

          {/* Duration */}
          {session.duration_minutes && (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-text-secondary bg-surface-raised/60 px-2.5 py-1 rounded-md border border-border/50">
              <Clock className="h-3.5 w-3.5 text-text-muted" />
              <span>{session.duration_minutes} min</span>
            </span>
          )}

          {/* Exercises Count */}
          {exercises.length > 0 && (
            <span className="text-[11px] font-mono text-text-muted">
              • {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {/* Delete action */}
        {onDelete && (
          <div className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-end">
            <button
              onClick={() => {
                if (confirm(`Delete this ${session.split_type || "workout"} session?`)) {
                  onDelete(session.id);
                }
              }}
              className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
              title="Delete Workout"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Exercises Section */}
      {exercises.length > 0 ? (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {exercises.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-lg bg-surface-raised/40 hover:bg-surface-raised/70 border border-border/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] font-mono text-text-muted font-bold select-none w-4 text-right">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {item.isCardio ? (
                      <Footprints className="h-3.5 w-3.5 text-emerald-400/80 shrink-0" />
                    ) : (
                      <Dumbbell className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    )}
                    <span className="text-xs font-medium text-text-primary truncate">
                      {item.name}
                    </span>
                  </div>
                </div>

                {item.details && (
                  <span className="px-2 py-0.5 rounded bg-surface border border-border/80 text-[11px] font-mono font-semibold text-accent shrink-0 shadow-sm">
                    {item.details}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : session.exercises ? (
        <div className="mt-4 text-xs font-mono text-text-secondary bg-surface-raised/40 p-3 rounded-lg border border-border/40 whitespace-pre-line">
          {session.exercises}
        </div>
      ) : null}

      {/* Notes */}
      {session.notes && (
        <div className="mt-3 pt-3 border-t border-border/40 flex items-start gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted shrink-0 mt-0.5">
            Note:
          </span>
          <p className="text-xs text-text-secondary italic leading-relaxed">
            {session.notes}
          </p>
        </div>
      )}
    </div>
  );
}
