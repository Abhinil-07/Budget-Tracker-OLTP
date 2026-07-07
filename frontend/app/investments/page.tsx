"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { useInvestments } from "../../hooks/useInvestments";
import PageWrapper from "../../components/layout/PageWrapper";
import AddInvestmentModal from "../../components/investments/AddInvestmentModal";
import UpdateValueModal from "../../components/investments/UpdateValueModal";
import { formatCurrency } from "../../lib/formatCurrency";
import { api, ApiError } from "../../lib/api";
import { useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  Coins,
  Briefcase,
  Edit3,
  Trash2,
  Percent,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  PiggyBank,
  ShieldCheck,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Investment, InvestmentType } from "../../types/investment";

const TYPE_CONFIG = {
  fixed_deposit: {
    label: "Fixed Deposit",
    color: "#6C63FF", // Violet
    icon: PiggyBank,
  },
  stock: {
    label: "Stocks",
    color: "#00D2FF", // Cyan
    icon: TrendingUp,
  },
  mutual_fund: {
    label: "Mutual Funds",
    color: "#3B82F6", // Blue
    icon: Briefcase,
  },
  ppf: {
    label: "PPF",
    color: "#10B981", // Emerald Green
    icon: ShieldCheck,
  },
};

export default function InvestmentsPage() {
  const { token, hydrated, hydrate } = useAuthStore();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const { data: investments = [], isLoading, error: fetchError } = useInvestments();

  // Summary Metrics calculations
  const summary = useMemo(() => {
    let totalInvestedCents = 0;
    let totalCurrentCents = 0;

    investments.forEach((inv) => {
      totalInvestedCents += inv.invested_amount_cents;
      totalCurrentCents += inv.current_value_cents;
    });

    const netReturnCents = totalCurrentCents - totalInvestedCents;
    const roiPercentage =
      totalInvestedCents > 0 ? (netReturnCents / totalInvestedCents) * 100 : 0;

    return {
      totalInvestedCents,
      totalCurrentCents,
      netReturnCents,
      roiPercentage,
    };
  }, [investments]);

  // Chart data calculations
  const chartData = useMemo(() => {
    const allocations: Record<InvestmentType, number> = {
      fixed_deposit: 0,
      stock: 0,
      mutual_fund: 0,
      ppf: 0,
    };

    investments.forEach((inv) => {
      allocations[inv.type] += inv.current_value_cents;
    });

    return Object.entries(allocations)
      .map(([type, valueCents]) => ({
        name: TYPE_CONFIG[type as InvestmentType]?.label || type,
        value: Number((valueCents / 100).toFixed(2)),
        color: TYPE_CONFIG[type as InvestmentType]?.color || "#FFF",
      }))
      .filter((item) => item.value > 0);
  }, [investments]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" investment?`)) return;

    try {
      setErrorMsg(null);
      await api.investments.delete(id);
      queryClient.invalidateQueries({ queryKey: ["investments"] });
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to delete investment.";
      setErrorMsg(msg);
    }
  };

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

  const isError = fetchError || errorMsg;

  return (
    <PageWrapper title="Investments" onAddTransactionClick={() => setShowAddModal(true)}>
      {/* Modals */}
      <AddInvestmentModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <UpdateValueModal
        isOpen={!!editingInvestment}
        onClose={() => setEditingInvestment(null)}
        investment={editingInvestment}
      />

      {isError && (
        <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{errorMsg || "Error loading investments data. Please reload."}</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-6">
          {/* Skeleton Header Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-surface p-6 rounded-xl border border-border h-24 flex flex-col justify-between" />
            ))}
          </div>
          {/* Skeleton Body */}
          <div className="bg-surface p-6 rounded-xl border border-border h-64 animate-pulse" />
        </div>
      ) : investments.length === 0 ? (
        <div className="bg-surface p-16 rounded-xl border border-border text-center flex flex-col items-center justify-center gap-4">
          <div className="p-4 bg-surface-raised rounded-full text-text-muted">
            <Coins className="h-10 w-10 text-accent/60" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">No investments added yet</h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm">
              Add your Mutual Funds, Stocks portfolios, Fixed Deposits, and PPF accounts to calculate your overall net worth.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-accent hover:bg-accent/90 text-text-primary rounded-lg text-xs font-semibold transition-all shadow-md shadow-accent/10"
          >
            Add First Investment
          </button>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8 select-none">
          {/* Header Portfolio Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Portfolio Value */}
            <div className="bg-surface p-6 rounded-xl border border-border relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
              <div className="text-xs text-text-muted uppercase tracking-wider mb-2 font-semibold">
                Total Portfolio Value
              </div>
              <div className="font-mono text-2xl font-extrabold text-text-primary">
                {formatCurrency(summary.totalCurrentCents, "INR")}
              </div>
            </div>

            {/* Total Invested */}
            <div className="bg-surface p-6 rounded-xl border border-border relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-surface-raised/20 rounded-full blur-2xl pointer-events-none" />
              <div className="text-xs text-text-muted uppercase tracking-wider mb-2 font-semibold">
                Capital Invested
              </div>
              <div className="font-mono text-2xl font-extrabold text-text-secondary">
                {formatCurrency(summary.totalInvestedCents, "INR")}
              </div>
            </div>

            {/* Total Returns (ROI) */}
            <div className="bg-surface p-6 rounded-xl border border-border relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none ${
                summary.netReturnCents >= 0 ? "bg-success/5" : "bg-danger/5"
              }`} />
              <div className="text-xs text-text-muted uppercase tracking-wider mb-2 font-semibold">
                Net Returns (ROI)
              </div>
              <div className="flex items-baseline gap-2">
                <div className={`font-mono text-2xl font-extrabold flex items-center ${
                  summary.netReturnCents >= 0 ? "text-success" : "text-danger"
                }`}>
                  {summary.netReturnCents >= 0 ? "+" : ""}
                  {formatCurrency(summary.netReturnCents, "INR")}
                </div>
                <div className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                  summary.netReturnCents >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                }`}>
                  {summary.netReturnCents >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {summary.roiPercentage.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* Allocation & Listings Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Donut Chart Allocation Box */}
            <div className="bg-surface p-6 rounded-xl border border-border lg:col-span-1 flex flex-col justify-between h-[360px]">
              <h4 className="text-xs text-text-muted uppercase tracking-wider font-semibold border-b border-border/40 pb-2">
                Asset Allocation
              </h4>
              {chartData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs text-text-muted font-mono">
                  No data to chart
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center h-full relative">
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`}
                          contentStyle={{
                            backgroundColor: "#13131A",
                            borderColor: "#2A2A38",
                            borderRadius: "8px",
                            color: "#F0F0F5",
                            fontSize: "12px",
                            fontFamily: "monospace",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono mt-2">
                    {chartData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-text-secondary">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Investments List */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                Investment Portfolios
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {investments.map((inv) => {
                  const config = TYPE_CONFIG[inv.type];
                  const Icon = config?.icon || Coins;
                  const gainCents = inv.current_value_cents - inv.invested_amount_cents;
                  const gainPercent =
                    inv.invested_amount_cents > 0
                      ? (gainCents / inv.invested_amount_cents) * 100
                      : 0;

                  return (
                    <div
                      key={inv.id}
                      className="bg-surface border border-border rounded-xl p-5 hover:border-border-raised transition-all flex flex-col justify-between gap-4 group"
                    >
                      {/* Top Header */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="p-2 rounded-lg"
                            style={{
                              backgroundColor: `${config?.color}15`,
                              color: config?.color,
                            }}
                          >
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-text-primary text-sm line-clamp-1">
                              {inv.name}
                            </h5>
                            <span className="text-[10px] text-text-secondary font-mono tracking-wide uppercase mt-0.5 block">
                              {config?.label}
                            </span>
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingInvestment(inv)}
                            className="p-1 rounded text-text-secondary hover:text-white hover:bg-surface-raised transition-colors"
                            title="Update Value"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id, inv.name)}
                            className="p-1 rounded text-text-secondary hover:text-danger hover:bg-surface-raised transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Values Grid */}
                      <div className="space-y-2">
                        {/* Current Value */}
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] text-text-muted uppercase font-semibold">
                            Current Value
                          </span>
                          <span className="font-mono text-base font-bold text-text-primary">
                            {formatCurrency(inv.current_value_cents, "INR")}
                          </span>
                        </div>

                        {/* Invested Amount */}
                        <div className="flex justify-between items-baseline border-t border-border/20 pt-1.5">
                          <span className="text-[10px] text-text-muted uppercase font-semibold">
                            Invested Capital
                          </span>
                          <span className="font-mono text-xs font-semibold text-text-secondary">
                            {formatCurrency(inv.invested_amount_cents, "INR")}
                          </span>
                        </div>

                        {/* Gains Row */}
                        <div className="flex justify-between items-baseline border-t border-border/20 pt-1.5">
                          <span className="text-[10px] text-text-muted uppercase font-semibold">
                            Return (ROI)
                          </span>
                          <span className={`font-mono text-xs font-bold ${
                            gainCents >= 0 ? "text-success" : "text-danger"
                          }`}>
                            {gainCents >= 0 ? "+" : ""}
                            {gainPercent.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Conditional Metadata (FD details) */}
                      {(inv.interest_rate !== null || inv.maturity_date !== null || inv.notes) && (
                        <div className="bg-surface-raised/40 p-2.5 rounded-lg border border-border/30 text-[10px] space-y-1.5 font-mono text-text-secondary">
                          {inv.interest_rate !== null && (
                            <div className="flex justify-between">
                              <span className="flex items-center gap-1">
                                <Percent className="h-3 w-3" /> Rate:
                              </span>
                              <span className="font-semibold text-text-primary">
                                {inv.interest_rate}%
                              </span>
                            </div>
                          )}
                          {inv.maturity_date && (
                            <div className="flex justify-between">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Matures:
                              </span>
                              <span className="font-semibold text-text-primary">
                                {new Date(inv.maturity_date).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          )}
                          {inv.notes && (
                            <div className="border-t border-border/30 pt-1 text-[10px] font-sans italic text-text-muted line-clamp-2">
                              {inv.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
