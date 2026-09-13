"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import PageWrapper from "@/components/layout/PageWrapper";
import AddMealModal from "@/components/food/AddMealModal";
import { useMealLogs } from "@/hooks/useMealLogs";
import type { MealSlot } from "@/types/food";
import {
  UtensilsCrossed,
  Calendar,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Sun,
  Moon,
  Apple,
} from "lucide-react";
import Link from "next/link";

const SLOTS: { slot: MealSlot; label: string; icon: any }[] = [
  { slot: "breakfast", label: "Breakfast", icon: Coffee },
  { slot: "lunch", label: "Lunch", icon: Sun },
  { slot: "dinner", label: "Dinner", icon: Moon },
  { slot: "snack", label: "Snack / Tea", icon: Apple },
];

export default function FoodPage() {
  const { token, hydrated, hydrate } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlotForAdd, setSelectedSlotForAdd] = useState<MealSlot>("lunch");
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !token) {
      window.location.href = "/login";
    }
  }, [hydrated, token]);

  const { meals, isLoading, deleteMeal } = useMealLogs({
    date_from: selectedDate,
    date_to: selectedDate,
  });

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  return (
    <PageWrapper
      title="Food & Meals Log"
      onAddTransactionClick={() => {
        setSelectedSlotForAdd("lunch");
        setShowAddModal(true);
      }}
      actionLabel="Log Meal"
    >
      <AddMealModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        defaultDate={selectedDate}
        defaultSlot={selectedSlotForAdd}
      />

      {/* Date Bar */}
      <div className="p-4 bg-surface border border-border rounded-xl flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDate(-1)}
            className="p-1.5 rounded-lg bg-surface-raised border border-border hover:text-white text-text-secondary transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-mono font-semibold text-text-primary px-2">
            {selectedDate} {isToday && <span className="text-accent text-xs">(Today)</span>}
          </span>
          <button
            onClick={() => changeDate(1)}
            className="p-1.5 rounded-lg bg-surface-raised border border-border hover:text-white text-text-secondary transition-colors"
            title="Next Day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
              className="text-xs font-mono text-accent hover:underline ml-2"
            >
              Today
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-text-muted">
            {meals.length} meal{meals.length === 1 ? "" : "s"} logged
          </span>
          <Link
            href="/food/history"
            className="text-xs font-mono text-accent hover:underline"
          >
            Full History →
          </Link>
        </div>
      </div>

      {/* Meals Grid (4 Slots) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SLOTS.map(({ slot, label, icon: Icon }) => {
          const slotMeals = meals.filter((m) => m.meal_slot === slot);

          return (
            <div
              key={slot}
              className="bg-surface border border-border rounded-xl p-5 flex flex-col justify-between shadow-sm min-h-[160px]"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-surface-raised text-accent">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-mono uppercase tracking-wider font-semibold text-text-primary">
                      {label}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSlotForAdd(slot);
                      setShowAddModal(true);
                    }}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors font-mono"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {slotMeals.length === 0 ? (
                    <p className="text-xs text-text-muted italic py-2">
                      Nothing logged yet for {label.toLowerCase()}
                    </p>
                  ) : (
                    slotMeals.map((meal) => (
                      <div
                        key={meal.id}
                        className="bg-surface-raised/40 p-3 rounded-lg border border-border/40 flex items-start justify-between gap-3 group"
                      >
                        <div className="space-y-1 flex-1">
                          <p className="text-xs text-text-primary font-medium leading-relaxed">
                            {meal.what_i_ate}
                          </p>
                          <div className="flex items-center gap-2">
                            {meal.tag && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded capitalize ${
                                  meal.tag === "healthy"
                                    ? "bg-success/15 text-success border border-success/30"
                                    : meal.tag === "outside" || meal.tag === "junk"
                                    ? "bg-warning/15 text-warning border border-warning/30"
                                    : "bg-surface-raised text-text-muted border border-border"
                                }`}
                              >
                                {meal.tag}
                              </span>
                            )}
                            {meal.notes && (
                              <span className="text-[11px] text-text-muted italic">
                                {meal.notes}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm("Delete this meal entry?")) {
                              deleteMeal(meal.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-all"
                          title="Delete meal"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PageWrapper>
  );
}
