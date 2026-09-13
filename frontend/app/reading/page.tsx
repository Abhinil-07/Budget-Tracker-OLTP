"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import PageWrapper from "@/components/layout/PageWrapper";
import AddMediaModal from "@/components/reading/AddMediaModal";
import { useMediaItems } from "@/hooks/useMediaItems";
import type { MediaType, MediaStatus } from "@/types/media";
import {
  Tv,
  Book,
  Film,
  FileText,
  Star,
  Trash2,
  Bookmark,
  Plus,
  ExternalLink,
} from "lucide-react";

const TYPE_TABS: { type: string; label: string; icon: any }[] = [
  { type: "all", label: "All Items", icon: Bookmark },
  { type: "book", label: "Books", icon: Book },
  { type: "show", label: "Shows", icon: Tv },
  { type: "movie", label: "Movies", icon: Film },
  { type: "article", label: "Articles", icon: FileText },
];

export default function ReadingPage() {
  const { token, hydrated, hydrate } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTypeTab, setActiveTypeTab] = useState("all");
  const [activeStatusTab, setActiveStatusTab] = useState("all");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !token) {
      window.location.href = "/login";
    }
  }, [hydrated, token]);

  const { items, isLoading, updateItem, deleteItem } = useMediaItems();

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeTypeTab !== "all" && item.media_type !== activeTypeTab) return false;
      if (activeStatusTab !== "all" && item.status !== activeStatusTab) return false;
      return true;
    });
  }, [items, activeTypeTab, activeStatusTab]);

  const cycleStatus = async (id: string, current: MediaStatus) => {
    const next: MediaStatus =
      current === "want_to"
        ? "in_progress"
        : current === "in_progress"
        ? "done"
        : "want_to";
    await updateItem({ id, dto: { status: next } });
  };

  const getTypeIcon = (type: MediaType) => {
    switch (type) {
      case "book":
        return <Book className="h-4 w-4" />;
      case "show":
        return <Tv className="h-4 w-4" />;
      case "movie":
        return <Film className="h-4 w-4" />;
      case "article":
        return <FileText className="h-4 w-4" />;
    }
  };

  const getDomainFromUrl = (urlString: string) => {
    try {
      const parsed = new URL(urlString);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return "Open Link";
    }
  };

  return (
    <PageWrapper
      title="Reading & Watching"
      onAddTransactionClick={() => setShowAddModal(true)}
      actionLabel="Add Item"
    >
      <AddMediaModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        defaultType={activeTypeTab !== "all" ? (activeTypeTab as MediaType) : undefined}
      />

      {/* Top Controls Toolbar */}
      <div className="space-y-3">
        {/* Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
          {TYPE_TABS.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => setActiveTypeTab(type)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
                activeTypeTab === type
                  ? "bg-accent/20 text-accent border border-accent/40 font-semibold"
                  : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-raised"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Status Filter Pills */}
        <div className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted text-[11px] uppercase mr-1">Status:</span>
            {[
              { id: "all", label: "All" },
              { id: "in_progress", label: "In Progress" },
              { id: "want_to", label: "Want to" },
              { id: "done", label: "Completed" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveStatusTab(id)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  activeStatusTab === id
                    ? "bg-surface-raised text-text-primary font-semibold border border-border"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <span className="text-text-muted">
            {filteredItems.length} item{filteredItems.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Library Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-text-muted animate-pulse">
          Loading library...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-16 text-center text-text-secondary text-sm flex flex-col items-center justify-center gap-3">
          <Tv className="h-8 w-8 text-text-muted" />
          <p className="text-sm">No items in this collection yet</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add to Library</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-surface border border-border rounded-xl p-5 flex flex-col justify-between hover:border-border/80 transition-all group shadow-sm"
            >
              <div className="space-y-3">
                {/* Header: type & status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono uppercase">
                    {getTypeIcon(item.media_type)}
                    <span>{item.media_type}</span>
                  </div>

                  <button
                    onClick={() => cycleStatus(item.id, item.status)}
                    className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded capitalize transition-all ${
                      item.status === "done"
                        ? "bg-success/15 text-success border border-success/30"
                        : item.status === "in_progress"
                        ? "bg-accent/15 text-accent border border-accent/30"
                        : "bg-surface-raised text-text-muted border border-border hover:border-text-secondary"
                    }`}
                    title="Click to cycle status"
                  >
                    {item.status.replace("_", " ")}
                  </button>
                </div>

                {/* Title (clickable if URL present) */}
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-text-primary hover:text-accent leading-snug flex items-center gap-1.5 group/title"
                  >
                    <span>{item.title}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-accent shrink-0 opacity-70 group-hover/title:opacity-100" />
                  </a>
                ) : (
                  <h3 className="text-sm font-semibold text-text-primary leading-snug">
                    {item.title}
                  </h3>
                )}

                {/* Direct Link Badge */}
                {item.url && (
                  <div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent text-xs font-mono transition-colors"
                      title={item.url}
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[220px]">
                        {getDomainFromUrl(item.url)}
                      </span>
                    </a>
                  </div>
                )}

                {/* Star Rating */}
                {item.rating ? (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= item.rating!
                            ? "fill-accent text-accent"
                            : "text-border"
                        }`}
                      />
                    ))}
                  </div>
                ) : null}

                {/* Notes */}
                {item.notes && (
                  <p className="text-xs text-text-secondary leading-relaxed bg-surface-raised/40 p-2.5 rounded-lg border border-border/40">
                    {item.notes}
                  </p>
                )}
              </div>

              {/* Card Footer: actions */}
              <div className="pt-3 mt-3 border-t border-border/50 flex items-center justify-between">
                <span className="text-[10px] font-mono text-text-muted">
                  {item.created_at ? item.created_at.slice(0, 10) : ""}
                </span>
                <div className="flex items-center gap-2">
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded text-text-muted hover:text-accent hover:bg-surface-raised transition-colors"
                      title="Open Link"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${item.title}"?`)) {
                        deleteItem(item.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                    title="Delete Item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
