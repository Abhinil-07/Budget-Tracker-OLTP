export type MediaType = "book" | "show" | "movie" | "article";
export type MediaStatus = "want_to" | "in_progress" | "done";

export interface MediaItem {
  id: string;
  user_id: string;
  title: string;
  media_type: MediaType;
  status: MediaStatus;
  rating?: number | null;
  notes?: string | null;
  url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMediaItemDto {
  title: string;
  media_type: MediaType;
  status?: MediaStatus;
  rating?: number;
  notes?: string;
  url?: string;
}

export interface UpdateMediaItemDto {
  title?: string;
  media_type?: MediaType;
  status?: MediaStatus;
  rating?: number;
  notes?: string;
  url?: string;
}
