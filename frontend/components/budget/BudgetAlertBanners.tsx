"use client";

import React from "react";
import { AlertTriangle, AlertCircle, ShieldAlert, ArrowRight } from "lucide-react";
import { formatCurrency } from "../../lib/formatCurrency";
import Link from "next/link";

interface CategoryAlertItem {
  category: string;
  spentCents: number;
  limitCents: number;
  percentage: number;
  overCents: number;
}

interface BudgetAlertBannersProps {
  categoryBreakdown?: Array<{
    category: string;
    limit_cents: number | null;
    spent_cents: number;
    percentage_used?: number;
  }>;
  totalBudgetCents?: number;
  mtdSpentCents?: number;
  showLinkToBudget?: boolean;
}

export default function BudgetAlertBanners({
  categoryBreakdown = [],
  totalBudgetCents = 0,
  mtdSpentCents = 0,
  showLinkToBudget = false,
}: BudgetAlertBannersProps) {
  // Compute category alerts (>= 80%)
  const warnings: CategoryAlertItem[] = [];
  const exceeded: CategoryAlertItem[] = [];

  categoryBreakdown.forEach((item) => {
    if (!item.limit_cents || item.limit_cents <= 0) return;
    const spent = item.spent_cents;
    const limit = item.limit_cents;
    const pct = (spent / limit) * 100;
    const over = spent - limit;

    const alertItem: CategoryAlertItem = {
      category: item.category,
      spentCents: spent,
      limitCents: limit,
      percentage: Math.round(pct),
      overCents: over > 0 ? over : 0,
    };

    if (pct >= 100) {
      exceeded.push(alertItem);
    } else if (pct >= 80) {
      warnings.push(alertItem);
    }
  });

  // Overall budget checks
  const overallPct = totalBudgetCents > 0 ? (mtdSpentCents / totalBudgetCents) * 100 : 0;
  const isOverallExceeded = totalBudgetCents > 0 && mtdSpentCents >= totalBudgetCents;
  const isOverallWarning = totalBudgetCents > 0 && overallPct >= 80 && !isOverallExceeded;

  if (exceeded.length === 0 && warnings.length === 0 && !isOverallExceeded && !isOverallWarning) {
    return null;
  }

  return (
    <div className="space-y-3 font-sans">
      {/* 1. EXCEEDED (100%+) CRITICAL ALERTS - RED */}
      {(exceeded.length > 0 || isOverallExceeded) && (
        <div className="bg-danger/10 border border-danger/30 p-4 rounded-xl text-danger animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-danger/20 rounded-lg shrink-0 mt-0.5">
              <ShieldAlert className="h-5 w-5 text-danger" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold tracking-tight text-danger flex items-center gap-1.5">
                  Budget Limit Exceeded (100%+)
                </h4>
                {showLinkToBudget && (
                  <Link
                    href="/budget"
                    className="text-xs font-semibold text-danger hover:underline flex items-center gap-1 font-mono"
                  >
                    View Budget <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
              <ul className="text-xs space-y-1 text-danger/90 font-mono">
                {isOverallExceeded && (
                  <li>
                    🚨 <strong>Overall Monthly Budget:</strong> Used {formatCurrency(mtdSpentCents, "INR")} of {formatCurrency(totalBudgetCents, "INR")} ({Math.round(overallPct)}%) — Over by {formatCurrency(mtdSpentCents - totalBudgetCents, "INR")}
                  </li>
                )}
                {exceeded.map((item) => (
                  <li key={item.category}>
                    • <strong>{item.category}:</strong> Spent {formatCurrency(item.spentCents, "INR")} / {formatCurrency(item.limitCents, "INR")} ({item.percentage}%) — Exceeded by {formatCurrency(item.overCents, "INR")}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 2. WARNING (80% - 99%) ALERTS - AMBER/YELLOW */}
      {(warnings.length > 0 || isOverallWarning) && (
        <div className="bg-warning/10 border border-warning/30 p-4 rounded-xl text-warning animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-warning/20 rounded-lg shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold tracking-tight text-warning flex items-center gap-1.5">
                  Budget Threshold Warnings (80%+)
                </h4>
                {showLinkToBudget && (
                  <Link
                    href="/budget"
                    className="text-xs font-semibold text-warning hover:underline flex items-center gap-1 font-mono"
                  >
                    View Budget <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
              <ul className="text-xs space-y-1 text-warning/90 font-mono">
                {isOverallWarning && (
                  <li>
                    ⚠️ <strong>Overall Monthly Budget:</strong> Reached {Math.round(overallPct)}% limit ({formatCurrency(mtdSpentCents, "INR")} spent of {formatCurrency(totalBudgetCents, "INR")})
                  </li>
                )}
                {warnings.map((item) => (
                  <li key={item.category}>
                    • <strong>{item.category}:</strong> Reached {item.percentage}% limit ({formatCurrency(item.spentCents, "INR")} / {formatCurrency(item.limitCents, "INR")})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
