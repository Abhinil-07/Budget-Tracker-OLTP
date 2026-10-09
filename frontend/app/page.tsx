"use client";

import React, { useEffect, useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import PageWrapper from "@/components/layout/PageWrapper";
import { useAccounts } from "@/hooks/useAccounts";
import { useBudget } from "@/hooks/useBudget";
import { useGymSessions } from "@/hooks/useGymSessions";
import { useMealLogs } from "@/hooks/useMealLogs";
import { useStudyLogs, useStudyGoals } from "@/hooks/useStudyLogs";
import { useMediaItems } from "@/hooks/useMediaItems";
import { formatCurrency } from "@/lib/formatCurrency";
import {
  Wallet,
  Dumbbell,
  UtensilsCrossed,
  BookOpen,
  Tv,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  Target,
  Sparkles,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { refreshAccessToken } from "@/lib/api";

export default function OverviewPage() {
  const { token, user, hydrated, hydrate } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Auto-refresh queries whenever the user focuses or returns to the dashboard tab
  useEffect(() => {
    const handleRefresh = () => {
      queryClient.invalidateQueries();
    };

    window.addEventListener("focus", handleRefresh);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        handleRefresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Background heartbeat: keep rolling session active
    const interval = setInterval(() => {
      refreshAccessToken();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [queryClient]);

  useEffect(() => {
    if (hydrated && !token) {
      window.location.href = "/login";
    }
  }, [hydrated, token]);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const currentMonth = useMemo(() => today.slice(0, 7), [today]);

  // Module 1: Finance
  const { data: accounts = [] } = useAccounts();
  const { data: budget } = useBudget();
  const totalBalanceCents = useMemo(() => {
    return accounts
      .filter((a) => a.type !== "credit_card")
      .reduce((sum, a) => sum + a.balance_cents, 0);
  }, [accounts]);

  // Module 2: Gym
  const { sessions: gymSessions } = useGymSessions();
  const todayWorkout = useMemo(() => {
    return gymSessions.find((s) => s.session_date === today);
  }, [gymSessions, today]);
  const weeklyWorkouts = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const threshold = d.toISOString().split("T")[0];
    return gymSessions.filter((s) => s.session_date >= threshold).length;
  }, [gymSessions]);

  // Module 3: Food
  const { meals } = useMealLogs({ date_from: today, date_to: today });

  // Module 4: Study
  const { logs: studyLogs } = useStudyLogs({ date_from: today, date_to: today });
  const todayStudyMinutes = useMemo(() => {
    return studyLogs.reduce((sum, l) => sum + (l.minutes || 0), 0);
  }, [studyLogs]);
  const { goals: studyGoals } = useStudyGoals();
  const currentGoals = useMemo(() => {
    return studyGoals.filter((g) => g.month.startsWith(currentMonth));
  }, [studyGoals, currentMonth]);
  const completedGoalsCount = useMemo(() => {
    return currentGoals.filter((g) => g.status === "done").length;
  }, [currentGoals]);

  // Module 5: Reading
  const { items: mediaItems } = useMediaItems({ status: "in_progress" });

  const dateFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  return (
    <PageWrapper title="Life OS Overview">
      {/* Welcome Hero Banner */}
      <div className="p-6 rounded-xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-accent uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Daily Command Dashboard</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            Hi, {user?.email ? user.email.split("@")[0] : "Abhinil"}
          </h2>
          <p className="text-xs text-text-muted font-mono">{dateFormatted}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/finance/transactions"
            className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border hover:border-accent text-xs font-medium text-text-secondary hover:text-white transition-all font-mono"
          >
            + Transaction
          </Link>
          <Link
            href="/gym"
            className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border hover:border-accent text-xs font-medium text-text-secondary hover:text-white transition-all font-mono"
          >
            + Workout
          </Link>
          <Link
            href="/food"
            className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border hover:border-accent text-xs font-medium text-text-secondary hover:text-white transition-all font-mono"
          >
            + Meal
          </Link>
          <Link
            href="/study"
            className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border hover:border-accent text-xs font-medium text-text-secondary hover:text-white transition-all font-mono"
          >
            + Study
          </Link>
        </div>
      </div>

      {/* Modules At-A-Glance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Finance Command */}
        <Link
          href="/finance"
          className="bg-surface border border-border hover:border-accent/40 rounded-xl p-5 flex flex-col justify-between transition-all group shadow-sm"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/15 text-accent">
                  <Wallet className="h-4 w-4" />
                </div>
                <span className="text-xs font-mono uppercase tracking-wider font-semibold text-text-primary">
                  Finance
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-text-muted uppercase">Liquid Balance</span>
              <div className="text-xl font-bold font-mono text-text-primary mt-0.5">
                {formatCurrency(totalBalanceCents, "INR")}
              </div>
            </div>

            {budget && (
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between text-text-muted text-[11px]">
                  <span>Monthly Budget</span>
                  <span>{Math.round(budget.percentage_used || 0)}% used</span>
                </div>
                <div className="w-full bg-surface-raised rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      (budget.percentage_used || 0) >= 90
                        ? "bg-danger"
                        : (budget.percentage_used || 0) >= 75
                        ? "bg-warning"
                        : "bg-success"
                    }`}
                    style={{ width: `${Math.min(100, budget.percentage_used || 0)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 mt-4 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-text-muted">
            <span>{accounts.length} Accounts</span>
            <span className="text-accent group-hover:underline">Open Finance →</span>
          </div>
        </Link>

        {/* Card 2: Gym & Workout */}
        <Link
          href="/gym"
          className="bg-surface border border-border hover:border-accent/40 rounded-xl p-5 flex flex-col justify-between transition-all group shadow-sm"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/15 text-accent">
                  <Dumbbell className="h-4 w-4" />
                </div>
                <span className="text-xs font-mono uppercase tracking-wider font-semibold text-text-primary">
                  Gym
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-text-muted uppercase">Today's Workout</span>
              <div className="mt-1 flex items-center gap-2">
                {todayWorkout ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm font-semibold text-text-primary">
                      {todayWorkout.split_type} ({todayWorkout.duration_minutes || 60}m)
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-text-secondary">Not logged yet today</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
              <Flame className="h-3.5 w-3.5 text-accent" />
              <span>{weeklyWorkouts} workout{weeklyWorkouts === 1 ? "" : "s"} in last 7 days</span>
            </div>
          </div>

          <div className="pt-3 mt-4 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-text-muted">
            <span>{gymSessions.length} total sessions</span>
            <span className="text-accent group-hover:underline">Log Workout →</span>
          </div>
        </Link>

        {/* Card 3: Food & Meals */}
        <Link
          href="/food"
          className="bg-surface border border-border hover:border-accent/40 rounded-xl p-5 flex flex-col justify-between transition-all group shadow-sm"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/15 text-accent">
                  <UtensilsCrossed className="h-4 w-4" />
                </div>
                <span className="text-xs font-mono uppercase tracking-wider font-semibold text-text-primary">
                  Food
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-text-muted uppercase">Today's Nutrition</span>
              <div className="text-xl font-bold font-mono text-text-primary mt-0.5">
                {meals.length} meal{meals.length === 1 ? "" : "s"} logged
              </div>
            </div>

            <div className="flex gap-1">
              {["breakfast", "lunch", "dinner", "snack"].map((slot) => {
                const logged = meals.some((m) => m.meal_slot === slot);
                return (
                  <span
                    key={slot}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded capitalize ${
                      logged
                        ? "bg-accent/20 text-accent border border-accent/40 font-semibold"
                        : "bg-surface-raised text-text-muted border border-border"
                    }`}
                  >
                    {slot.slice(0, 1).toUpperCase() + slot.slice(1, 4)}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="pt-3 mt-4 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-text-muted">
            <span>Daily nutrition log</span>
            <span className="text-accent group-hover:underline">Log Meal →</span>
          </div>
        </Link>

        {/* Card 4: Study & Goals */}
        <Link
          href="/study"
          className="bg-surface border border-border hover:border-accent/40 rounded-xl p-5 flex flex-col justify-between transition-all group shadow-sm"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/15 text-accent">
                  <BookOpen className="h-4 w-4" />
                </div>
                <span className="text-xs font-mono uppercase tracking-wider font-semibold text-text-primary">
                  Study & Goals
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-text-muted uppercase">Today's Focus</span>
              <div className="text-xl font-bold font-mono text-text-primary mt-0.5">
                {todayStudyMinutes} mins
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
              <Target className="h-3.5 w-3.5 text-accent" />
              <span>
                {completedGoalsCount} of {currentGoals.length} monthly goal{currentGoals.length === 1 ? "" : "s"} done
              </span>
            </div>
          </div>

          <div className="pt-3 mt-4 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-text-muted">
            <span>Focus & skills</span>
            <span className="text-accent group-hover:underline">Study Log →</span>
          </div>
        </Link>

        {/* Card 5: Reading & Watching */}
        <Link
          href="/reading"
          className="bg-surface border border-border hover:border-accent/40 rounded-xl p-5 flex flex-col justify-between transition-all group shadow-sm"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/15 text-accent">
                  <Tv className="h-4 w-4" />
                </div>
                <span className="text-xs font-mono uppercase tracking-wider font-semibold text-text-primary">
                  Reading & Watching
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-text-muted uppercase">In Progress</span>
              <div className="text-xl font-bold font-mono text-text-primary mt-0.5">
                {mediaItems.length} title{mediaItems.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="space-y-1">
              {mediaItems.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  className="text-xs text-text-secondary truncate font-medium flex items-center gap-1.5"
                >
                  <span className="w-1 h-1 rounded-full bg-accent" />
                  <span>{item.title}</span>
                </div>
              ))}
              {mediaItems.length === 0 && (
                <span className="text-xs text-text-muted italic">Nothing currently in progress</span>
              )}
            </div>
          </div>

          <div className="pt-3 mt-4 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-text-muted">
            <span>Media backlog</span>
            <span className="text-accent group-hover:underline">Open Library →</span>
          </div>
        </Link>
      </div>
    </PageWrapper>
  );
}
