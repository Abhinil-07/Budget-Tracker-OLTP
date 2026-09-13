-- Migration: Gym Module
CREATE TABLE IF NOT EXISTS public.gym_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    split_type TEXT,
    exercises TEXT,
    duration_minutes INT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gym_sessions_user_id ON public.gym_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_sessions_session_date ON public.gym_sessions(session_date);

ALTER TABLE public.gym_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gym sessions"
    ON public.gym_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gym sessions"
    ON public.gym_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gym sessions"
    ON public.gym_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gym sessions"
    ON public.gym_sessions FOR DELETE
    USING (auth.uid() = user_id);
