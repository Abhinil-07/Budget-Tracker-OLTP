-- Migration: Food Module
CREATE TABLE IF NOT EXISTS public.meal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meal_date DATE NOT NULL,
    meal_slot TEXT CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack')),
    what_i_ate TEXT,
    tag TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_id ON public.meal_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_logs_meal_date ON public.meal_logs(meal_date);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meal logs"
    ON public.meal_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal logs"
    ON public.meal_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal logs"
    ON public.meal_logs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal logs"
    ON public.meal_logs FOR DELETE
    USING (auth.uid() = user_id);
