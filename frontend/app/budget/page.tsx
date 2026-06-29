"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { useBudget } from "../../hooks/useBudget";
import PageWrapper from "../../components/layout/PageWrapper";
import { formatCurrency } from "../../lib/formatCurrency";
import { api, ApiError } from "../../lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { CATEGORIES } from "../../lib/constants";
import {
  PieChart,
  Edit3,
  Check,
  X,
  AlertCircle,
  PiggyBank,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

export default function BudgetPage() {
  const queryClient = useQueryClient();
  const { token, hydrated, hydrate } = useAuthStore();

  // Edit budget states
  const [isEditing, setIsEditing] = useState(false);
  const [budgetValue, setBudgetValue] = useState("");
  const [categoryLimits, setCategoryLimits] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Generate list of the last 6 months for the timeframe selector (timezone-safe)
  const timeframes = useMemo(() => {
    const list = [];
    const dateObj = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(dateObj.getFullYear(), dateObj.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "long", year: "numeric" });
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      list.push({ label, value });
    }
    return list;
  }, []);

  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("");

  useEffect(() => {
    if (timeframes.length > 0 && !selectedTimeframe) {
      setSelectedTimeframe(timeframes[0].value);
    }
  }, [timeframes, selectedTimeframe]);

  // Hydrate auth
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Redirect if not logged in
  useEffect(() => {
    if (hydrated && !token) {
      window.location.href = "/login";
    }
  }, [hydrated, token]);

  // Fetch Budget for selected timeframe
  const { data: budget, isLoading: budgetLoading, error: budgetError } = useBudget(selectedTimeframe || undefined);

  // Sync edit input value when budget data loads
  useEffect(() => {
    if (budget) {
      setBudgetValue((budget.total_cents / 100).toString());
      const limits: Record<string, string> = {};
      if (budget.category_limits) {
        Object.entries(budget.category_limits).forEach(([cat, val]) => {
          limits[cat] = (val / 100).toString();
        });
      }
      setCategoryLimits(limits);
    }
  }, [budget]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    if (budget) {
      setBudgetValue((budget.total_cents / 100).toString());
      const limits: Record<string, string> = {};
      if (budget.category_limits) {
        Object.entries(budget.category_limits).forEach(([cat, val]) => {
          limits[cat] = (val / 100).toString();
        });
      }
      setCategoryLimits(limits);
    }
  };

  const handleSave = async () => {
    const numVal = Number(budgetValue);
    if (isNaN(numVal) || numVal < 0) {
      setError("Please enter a valid positive budget amount.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const amountCents = Math.round(numVal * 100);

      // Convert category limits to cents (if positive number)
      const limitsCents: Record<string, number> = {};
      Object.entries(categoryLimits).forEach(([cat, val]) => {
        const cleanVal = val.trim();
        if (cleanVal !== "") {
          const catVal = Number(cleanVal);
          if (!isNaN(catVal) && catVal >= 0) {
            limitsCents[cat] = Math.round(catVal * 100);
          }
        }
      });

      const res = await api.budget.update({
        total_cents: amountCents,
        category_limits: limitsCents,
      }, selectedTimeframe || undefined);
      if (res.error) throw new Error(res.error.message);

      queryClient.invalidateQueries({ queryKey: ["budget"] });
      setIsEditing(false);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Failed to update monthly budget.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const today = useMemo(() => new Date(), []);

  // Sort and merge categories by spent amount descending
  const sortedCategories = useMemo(() => {
    console.log("Budget API Response:", budget);
    const breakdown = budget?.category_breakdown || [];
    const limits = budget?.category_limits || {};

    const mergedMap = new Map<string, {
      category: string;
      limit_cents: number | null;
      spent_cents: number;
      remaining_cents: number;
      percentage_used: number;
    }>();

    // 1. Fill with the breakdown items from API
    breakdown.forEach((item) => {
      mergedMap.set(item.category, {
        category: item.category,
        limit_cents: item.limit_cents,
        spent_cents: item.spent_cents,
        remaining_cents: item.remaining_cents,
        percentage_used: item.percentage_used,
      });
    });

    // 2. Add any limits categories not yet in the breakdown (e.g. ₹0 spent ones)
    Object.entries(limits).forEach(([cat, limitCents]) => {
      if (!mergedMap.has(cat)) {
        mergedMap.set(cat, {
          category: cat,
          limit_cents: limitCents,
          spent_cents: 0,
          remaining_cents: limitCents,
          percentage_used: 0,
        });
      }
    });

    // 3. Sort by spent descending
    return Array.from(mergedMap.values()).sort((a, b) => b.spent_cents - a.spent_cents);
  }, [budget]);

  if (!hydrated || !token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent border-r-2" />
          <span className="text-sm text-text-secondary font-mono">Loading...</span>
        </div>
      </div>
    );
  }

  const totalBudgetCents = budget?.total_cents || 0;
  const mtdSpentCents = budget?.mtd_spent_cents || 0;
  const remainingCents = budget?.remaining_cents || 0;
  const percentageUsed = budget?.percentage_used || 0;

  // Progress Bar color selection
  let progressColor = "bg-success shadow-[0_0_12px_rgba(34,197,94,0.3)]";
  if (percentageUsed >= 90) {
    progressColor = "bg-danger shadow-[0_0_12px_rgba(239,68,68,0.3)]";
  } else if (percentageUsed >= 75) {
    progressColor = "bg-warning shadow-[0_0_12px_rgba(245,158,11,0.3)]";
  }

  return (
    <PageWrapper title="Budget">
      <div className="space-y-8">
        {/* Header summary */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Monthly Budget Control</h2>
          <p className="text-sm text-text-secondary mt-1">
            Allocate monthly spending targets and monitor category breakdowns.
          </p>
        </div>

        {/* Timeframe Selector Panel */}
        <div className="p-4 rounded-xl bg-surface border border-border/60 flex items-center justify-between flex-wrap gap-3 select-none">
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-text-secondary uppercase font-mono tracking-wider font-semibold">Active Period:</span>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="bg-surface-raised border border-border rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer min-w-[150px]"
            >
              {timeframes.map((tf: { label: string; value: string }) => (
                <option key={tf.value} value={tf.value}>
                  {tf.label}
                </option>
              ))}
            </select>
          </div>
          {selectedTimeframe && timeframes.length > 0 && selectedTimeframe !== timeframes[0].value && (
            <button
              onClick={() => setSelectedTimeframe(timeframes[0].value)}
              className="text-xs text-accent hover:underline font-mono"
            >
              Back to Current Month
            </button>
          )}
        </div>

        {budgetError && (
          <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>Error loading budget profile. Please reload.</span>
          </div>
        )}

        {budgetLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-28 bg-surface rounded-xl border border-border" />
            <div className="h-40 bg-surface rounded-xl border border-border" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT SECTION: Budget Input and Progress Bar */}
            <div className="lg:col-span-2 space-y-6">
              {/* Budget input card */}
              <div className="bg-surface border border-border rounded-xl p-6 space-y-6 shadow-lg font-display">
                {isEditing ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider font-mono border-b border-border/50 pb-2 mb-4">
                        Edit Budget Limits
                      </h3>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider font-mono mb-2">
                        Total Monthly Limit (₹)
                      </label>
                      <div className="relative max-w-xs">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-mono">₹</span>
                        <input
                          type="number"
                          value={budgetValue}
                          onChange={(e) => setBudgetValue(e.target.value)}
                          className="w-full pl-8 pr-4 py-2 bg-surface-raised border border-border rounded-lg text-text-primary text-lg font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                          placeholder="0.00"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono mb-3 border-b border-border/50 pb-2">
                        Category Limits (Optional)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {CATEGORIES.map((cat) => (
                          <div key={cat} className="flex flex-col gap-1.5">
                            <label className="text-xs text-text-secondary truncate font-medium">
                              {cat}
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-mono text-xs">₹</span>
                              <input
                                type="number"
                                value={categoryLimits[cat] || ""}
                                onChange={(e) => {
                                  setCategoryLimits((prev) => ({
                                    ...prev,
                                    [cat]: e.target.value,
                                  }));
                                }}
                                className="w-full pl-7 pr-3 py-1.5 bg-surface-raised border border-border rounded-md text-xs text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                                placeholder="No limit"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-success text-white rounded-lg text-sm font-semibold hover:bg-success/90 transition-all duration-150"
                      >
                        <Check className="h-4 w-4" />
                        <span>Save Changes</span>
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-surface-raised border border-border rounded-lg text-sm font-semibold text-text-secondary hover:text-text-primary transition-all duration-150"
                      >
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                    {error && <p className="text-xs text-danger font-mono">{error}</p>}
                  </div>
                ) : totalBudgetCents === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
                    <div className="p-3 bg-accent/10 border border-accent/20 rounded-xl">
                      <PiggyBank className="h-8 w-8 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary font-semibold">Set a monthly budget to track spending</p>
                      <p className="text-xs text-text-muted mt-1">Configure limits on categories to control your monthly burn rate.</p>
                    </div>
                    <button
                      onClick={handleStartEdit}
                      className="flex items-center gap-1.5 px-5 py-2 bg-accent hover:bg-accent/90 text-text-primary rounded-lg text-xs font-semibold transition-all shadow-md shadow-accent/10"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Set Monthly Budget</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider font-mono">
                          Target Monthly Limit
                        </h3>
                        <div className="flex items-baseline gap-3 mt-2">
                          <span className="font-mono text-3xl font-extrabold text-text-primary tracking-tight">
                            {formatCurrency(totalBudgetCents, "INR")}
                          </span>
                          <button
                            onClick={handleStartEdit}
                            className="text-accent hover:underline text-xs flex items-center gap-1 font-semibold"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>
                      <div className="p-3 bg-accent/10 border border-accent/20 rounded-xl">
                        <PiggyBank className="h-6 w-6 text-accent" />
                      </div>
                    </div>

                    {/* Progress bar info */}
                    <div className="space-y-3 pt-4 border-t border-border/50">
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="text-text-secondary">Spent Month-to-Date</span>
                        <span className="text-text-primary font-mono">
                          {formatCurrency(mtdSpentCents, "INR")} ({Math.round(percentageUsed)}%)
                        </span>
                      </div>
                      <div className="w-full bg-border rounded-full h-3.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                          style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-text-muted font-mono pt-1">
                        <span>{formatCurrency(remainingCents, "INR")} remaining</span>
                        {percentageUsed >= 90 ? (
                          <span className="text-danger font-semibold">Over Budget Alert!</span>
                        ) : percentageUsed >= 75 ? (
                          <span className="text-warning font-semibold">Nearing budget threshold (75%+)</span>
                        ) : null}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Tips / Insights Panel */}
              <div className="bg-surface border border-border rounded-xl p-6 flex gap-4 shadow-lg">
                <div className="p-3 bg-success/15 border border-success/20 rounded-xl h-11 w-11 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-success" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-text-primary">Budget Goal Insight</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {percentageUsed === 0
                      ? "You haven't recorded any expenses this month. Start logging transactions to view live analytics!"
                      : percentageUsed > 100
                      ? "You have crossed your target monthly budget limit. Consider trimming down discretionary expenses like dining and shopping."
                      : `You have utilized ${Math.round(percentageUsed)}% of your monthly budget. You have an average of ${formatCurrency(
                          remainingCents / Math.max(30 - today.getDate(), 1),
                          "INR"
                        )} left to spend daily for the remainder of this month.`}
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT SECTION: Category Breakdown */}
            <div className="lg:col-span-1 bg-surface border border-border rounded-xl p-6 flex flex-col justify-between shadow-lg">
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-1">
                  <PieChart className="h-4.5 w-4.5 text-accent" />
                  <span>Category Breakdown</span>
                </h3>
                <p className="text-xs text-text-secondary mb-6">
                  Distribution of monthly spending.
                </p>

                {sortedCategories.length === 0 ? (
                  <div className="text-center py-12 text-text-secondary text-sm">
                    No spending recorded this month.
                  </div>
                ) : (
                  <div className="space-y-5">
                    {sortedCategories.map((cat) => {
                      const limit = cat.limit_cents;
                      const spent = cat.spent_cents;
                      const hasLimit = limit !== null && limit > 0;
                      const pct = hasLimit ? Math.min(100, (spent / limit) * 100) : 0;

                      // Decide progress color for this category
                      let catProgressColor = "bg-accent";
                      if (hasLimit) {
                        if (pct >= 90) catProgressColor = "bg-danger";
                        else if (pct >= 75) catProgressColor = "bg-warning";
                      }

                      return (
                        <div key={cat.category} className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-text-primary font-semibold truncate max-w-[120px]">
                              {cat.category}
                            </span>
                            <span className="text-text-secondary font-mono font-semibold">
                              {formatCurrency(spent, "INR")}
                              {hasLimit ? (
                                <span className="text-text-muted">
                                  {" "}
                                  / {formatCurrency(limit, "INR")}
                                </span>
                              ) : (
                                <span className="text-text-muted text-[10px] lowercase italic">
                                  {" "}
                                  (no limit)
                                </span>
                              )}
                            </span>
                          </div>
                          {hasLimit && (
                            <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`rounded-full h-full ${catProgressColor}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                          <div className="flex justify-between text-[10px] text-text-muted font-mono">
                            {hasLimit ? (
                              <span>{Math.round(pct)}% of category limit</span>
                            ) : (
                              <span>No target category limit configured</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {sortedCategories.length > 0 && (
                <div className="border-t border-border/50 pt-4 mt-6 flex justify-between items-center text-xs text-text-muted font-mono">
                  <span>Top Category:</span>
                  <span className="text-accent font-semibold flex items-center gap-0.5">
                    {sortedCategories[0].category}
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
