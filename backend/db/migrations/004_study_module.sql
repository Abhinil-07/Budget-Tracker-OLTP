-- Migration: Study Module
CREATE TABLE IF NOT EXISTS public.study_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    study_date DATE NOT NULL,
    topic TEXT,
    minutes INT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_logs_user_id ON public.study_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_study_logs_study_date ON public.study_logs(study_date);

ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own study logs"
    ON public.study_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study logs"
    ON public.study_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study logs"
    ON public.study_logs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study logs"
    ON public.study_logs FOR DELETE
    USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.study_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    goal_text TEXT,
    status TEXT CHECK (status IN ('not_started', 'in_progress', 'done')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_goals_user_id ON public.study_goals(user_id);

ALTER TABLE public.study_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own study goals"
    ON public.study_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study goals"
    ON public.study_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study goals"
    ON public.study_goals FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study goals"
    ON public.study_goals FOR DELETE
    USING (auth.uid() = user_id);
