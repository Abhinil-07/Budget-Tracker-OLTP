"use client";

import React, { useState } from "react";
import { X, Tv, Book, Film, FileText, Star, Link2 } from "lucide-react";
import { useMediaItems } from "@/hooks/useMediaItems";
import type { MediaType, MediaStatus } from "@/types/media";

interface AddMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: MediaType;
}

const MEDIA_TYPES: { type: MediaType; label: string; icon: any }[] = [
  { type: "book", label: "Book", icon: Book },
  { type: "show", label: "Show", icon: Tv },
  { type: "movie", label: "Movie", icon: Film },
  { type: "article", label: "Article", icon: FileText },
];

const STATUSES: { status: MediaStatus; label: string }[] = [
  { status: "want_to", label: "Want to" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Completed" },
];

export default function AddMediaModal({ isOpen, onClose, defaultType }: AddMediaModalProps) {
  const [title, setTitle] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>(defaultType || "book");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<MediaStatus>("want_to");
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { createItem, isCreating } = useMediaItems();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }

    let formattedUrl = url.trim();
    if (formattedUrl && !formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      await createItem({
        title: title.trim(),
        media_type: mediaType,
        status,
        url: formattedUrl || undefined,
        rating: rating > 0 ? rating : undefined,
        notes: notes.trim() || undefined,
      });
      // reset form
      setTitle("");
      setUrl("");
      setNotes("");
      setRating(0);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add media item.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-raised/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent/15 text-accent">
              <Tv className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-text-primary">Add to Library</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/25 text-danger rounded-lg text-xs">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary">
              Title
            </label>
            <input
              type="text"
              placeholder="e.g. Netflix Tech Blog, Dune Messiah, Severance S2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>

          {/* Media Type Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary">
              Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {MEDIA_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setMediaType(type)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-all ${
                    mediaType === type
                      ? "bg-accent/15 border-accent text-accent font-semibold"
                      : "bg-surface-raised border-border text-text-muted hover:text-text-primary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Direct Link / URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-accent" />
                <span>Link / URL</span>
              </span>
              <span className="text-[10px] text-text-muted">
                {mediaType === "article" ? "Recommended for articles" : "Optional"}
              </span>
            </label>
            <input
              type="url"
              placeholder="https://netflixtechblog.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent placeholder:text-text-muted/60"
            />
          </div>

          {/* Status Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary">
              Status
            </label>
            <div className="flex gap-2">
              {STATUSES.map(({ status: s, label }) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    status === s
                      ? "bg-accent/20 text-accent border border-accent/40 font-semibold"
                      : "bg-surface-raised border border-border text-text-muted hover:text-text-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating (optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center justify-between">
              <span>Rating (optional)</span>
              {rating > 0 && <span className="text-accent font-mono">{rating} / 5</span>}
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(rating === star ? 0 : star)}
                  className="p-1 text-text-muted hover:text-accent transition-colors"
                >
                  <Star
                    className={`h-5 w-5 ${
                      star <= rating ? "fill-accent text-accent" : "text-border"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <button
                  type="button"
                  onClick={() => setRating(0)}
                  className="text-[11px] font-mono text-text-muted hover:text-danger ml-2"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary">
              Notes / Key Takeaways (optional)
            </label>
            <textarea
              rows={2}
              placeholder="Key thoughts, quotes, or summary..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs font-sans text-text-primary focus:outline-none focus:border-accent resize-none placeholder:text-text-muted/60"
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
              {isCreating ? "Saving..." : "Add to Library"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
