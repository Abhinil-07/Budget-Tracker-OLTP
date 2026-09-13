-- Migration: Reading & Media Module
CREATE TABLE IF NOT EXISTS public.media_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('book', 'show', 'movie', 'article')),
    status TEXT CHECK (status IN ('want_to', 'in_progress', 'done')),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_items_user_id ON public.media_items(user_id);

ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own media items"
    ON public.media_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media items"
    ON public.media_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media items"
    ON public.media_items FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media items"
    ON public.media_items FOR DELETE
    USING (auth.uid() = user_id);
