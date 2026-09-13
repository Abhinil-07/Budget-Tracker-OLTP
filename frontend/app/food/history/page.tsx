"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import PageWrapper from "@/components/layout/PageWrapper";
import AddMealModal from "@/components/food/AddMealModal";
import { useMealLogs } from "@/hooks/useMealLogs";
import { UtensilsCrossed, Calendar, Trash2, Filter } from "lucide-react";

export default function FoodHistoryPage() {
  const { token, hydrated, hydrate } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [slotFilter, setSlotFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !token) {
      window.location.href = "/login";
    }
  }, [hydrated, token]);

  const { meals, isLoading, deleteMeal } = useMealLogs();

  const filteredMeals = useMemo(() => {
    return meals.filter((m) => {
      if (slotFilter !== "all" && m.meal_slot !== slotFilter) return false;
      if (tagFilter !== "all" && m.tag !== tagFilter) return false;
      return true;
    });
  }, [meals, slotFilter, tagFilter]);

  return (
    <PageWrapper
      title="Meals History"
      onAddTransactionClick={() => setShowAddModal(true)}
      actionLabel="Log Meal"
    >
      <AddMealModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

      {/* Filter toolbar */}
      <div className="p-4 bg-surface border border-border rounded-xl flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-text-muted" />
            <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">Slot:</span>
            <select
              value={slotFilter}
              onChange={(e) => setSlotFilter(e.target.value)}
              className="bg-surface-raised border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-text-primary focus:outline-none focus:border-accent cursor-pointer capitalize"
            >
              <option value="all">All Slots</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">Tag:</span>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="bg-surface-raised border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-text-primary focus:outline-none focus:border-accent cursor-pointer capitalize"
            >
              <option value="all">All Tags</option>
              <option value="home">Home</option>
              <option value="outside">Outside</option>
              <option value="healthy">Healthy</option>
              <option value="junk">Junk</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-mono text-text-muted">
          Showing {filteredMeals.length} meal{filteredMeals.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* List */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-mono text-text-muted animate-pulse">
            Loading meal history...
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="p-16 text-center text-text-secondary text-sm">
            No meals found matching the filters.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredMeals.map((meal) => (
              <div
                key={meal.id}
                className="p-5 hover:bg-surface-raised/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-surface-raised border border-border text-[11px] font-mono capitalize font-medium text-text-primary">
                      {meal.meal_slot}
                    </span>
                    <span className="text-xs font-mono text-text-muted flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {meal.meal_date}
                    </span>
                    {meal.tag && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded capitalize ${
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
                  </div>

                  <p className="text-sm text-text-primary font-medium">{meal.what_i_ate}</p>

                  {meal.notes && (
                    <p className="text-xs text-text-secondary italic">Note: {meal.notes}</p>
                  )}
                </div>

                <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      if (confirm("Delete this meal log?")) {
                        deleteMeal(meal.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                    title="Delete Meal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
