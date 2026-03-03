-- Create insight_comments table
CREATE TABLE public.insight_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID NOT NULL REFERENCES public.insights(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.insight_comments ENABLE ROW LEVEL SECURITY;

-- Policies for insight_comments
CREATE POLICY "Enable read access for all users" ON public.insight_comments FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.insight_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.insight_comments FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON public.insight_comments FOR DELETE USING (true);

-- Add update policy for existing insights table
CREATE POLICY "Enable update for all users" ON public.insights FOR UPDATE USING (true);
