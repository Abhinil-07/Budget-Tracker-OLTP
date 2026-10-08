"use client";

import React, { useState } from "react";
import { useBalances, usePeople, useSettle } from "@/hooks/useSplits";
import { formatCurrency } from "@/lib/formatCurrency";
import { Users, ArrowUpRight, ArrowDownRight, CheckCircle2, DollarSign, X } from "lucide-react";

export default function BalancesCard() {
  const { data: balances = [], isLoading } = useBalances();
  const { data: people = [] } = usePeople();
  const settleMutation = useSettle();

  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleNote, setSettleNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mePerson = people.find((p) => p.is_me);

  // Total net owed to me across all friends
  const totalNetOwedToMe = balances.reduce((acc, b) => acc + b.net_balance_paise, 0);

  const handleOpenSettle = (personId: string, currentBalancePaise: number) => {
    setSelectedPersonId(personId);
    if (currentBalancePaise > 0) {
      setSettleAmount((currentBalancePaise / 100).toFixed(0));
    } else {
      setSettleAmount("");
    }
    setError(null);
    setSettleModalOpen(true);
  };

  const handleSubmitSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPersonId) {
      setError("Please select a person");
      return;
    }

    if (!mePerson) {
      setError("Default user profile not found");
      return;
    }

    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const amountPaise = Math.round(amt * 100);

    try {
      await settleMutation.mutateAsync({
        from_person: selectedPersonId,
        to_person: mePerson.id,
        amount_paise: amountPaise,
        note: settleNote || "Manual settlement",
        date: new Date().toISOString().split("T")[0],
      });
      setSettleModalOpen(false);
      setSettleAmount("");
      setSettleNote("");
    } catch (err: any) {
      setError(err?.message || "Failed to record settlement");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#121216] border border-white/[0.08] rounded-[26px] p-6 shadow-xl animate-pulse">
        <div className="h-4 w-36 bg-white/10 rounded mb-4" />
        <div className="h-10 w-48 bg-white/10 rounded mb-4" />
        <div className="space-y-2">
          <div className="h-6 bg-white/10 rounded w-full" />
          <div className="h-6 bg-white/10 rounded w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#121216] border border-white/[0.08] rounded-[26px] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Shared Splits & Balances</h4>
              <span className="text-[11px] text-neutral-400">
                {totalNetOwedToMe > 0
                  ? "Net owed to you across splits"
                  : totalNetOwedToMe < 0
                  ? "Net amount you owe others"
                  : "All friend splits are settled"}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (balances.length > 0) {
                handleOpenSettle(balances[0].person_id, balances[0].net_balance_paise);
              }
            }}
            className="text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full transition-colors"
          >
            Record Repayment
          </button>
        </div>

        <div className="mb-4">
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans text-white">
            {totalNetOwedToMe >= 0 ? "+" : "-"}
            {formatCurrency(Math.abs(totalNetOwedToMe), "INR")}
          </div>
        </div>

        {/* Per-person list */}
        {balances.length === 0 ? (
          <div className="py-4 text-center text-xs text-neutral-400 font-mono border-t border-white/[0.06]">
            No friend splits recorded yet. Reply to Telegram bot to split an expense!
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05] border-t border-white/[0.06]">
            {balances.map((b) => {
              const owesMe = b.net_balance_paise > 0;
              const iOwe = b.net_balance_paise < 0;
              const isSettled = b.net_balance_paise === 0;

              return (
                <div key={b.person_id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{b.name}</span>
                    {b.aliases && b.aliases.length > 0 && (
                      <span className="text-[10px] text-neutral-500">({b.aliases.join(", ")})</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className={`font-sans font-bold ${
                        owesMe ? "text-[#6EE7B7]" : iOwe ? "text-[#FFA494]" : "text-neutral-400"
                      }`}
                    >
                      {owesMe && `owes you ${formatCurrency(b.net_balance_paise, "INR")}`}
                      {iOwe && `you owe ${formatCurrency(Math.abs(b.net_balance_paise), "INR")}`}
                      {isSettled && "Settled up"}
                    </span>

                    {owesMe && (
                      <button
                        onClick={() => handleOpenSettle(b.person_id, b.net_balance_paise)}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-full text-[10px] font-semibold transition-colors"
                        title="Record a repayment"
                      >
                        Settle
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settle Modal */}
      {settleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Record Repayment</h3>
              <button
                onClick={() => setSettleModalOpen(false)}
                className="text-text-muted hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded bg-danger/10 border border-danger/30 text-xs text-danger">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitSettle} className="space-y-4 text-xs">
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Repaid By</label>
                <select
                  value={selectedPersonId}
                  onChange={(e) => setSelectedPersonId(e.target.value)}
                  className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">Select person...</option>
                  {balances.map((b) => (
                    <option key={b.person_id} value={b.person_id}>
                      {b.name} (Balance: {b.net_balance_paise > 0 ? `+${(b.net_balance_paise/100).toFixed(0)}` : (b.net_balance_paise/100).toFixed(0)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-text-secondary mb-1 font-medium">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 150"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-text-secondary mb-1 font-medium">Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. GPay repayment"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-surface-raised border border-border text-text-secondary hover:text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settleMutation.isPending}
                  className="flex-1 py-2 rounded-lg bg-accent text-white font-semibold hover:bg-accent/90 transition-colors shadow-md shadow-accent/20"
                >
                  {settleMutation.isPending ? "Recording..." : "Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
