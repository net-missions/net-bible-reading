-- Create reading_progress table
CREATE TABLE IF NOT EXISTS public.reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, book, chapter)
);

-- Add RLS policies
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select only their own reading progress
CREATE POLICY "Users can view their own reading progress"
  ON public.reading_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own reading progress
CREATE POLICY "Users can insert their own reading progress"
  ON public.reading_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own reading progress
CREATE POLICY "Users can update their own reading progress"
  ON public.reading_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable admins to view all reading progress data
CREATE POLICY "Admins can view all reading progress"
  ON public.reading_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS reading_progress_user_id_idx ON public.reading_progress(user_id);

-- Add trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reading_progress_updated_at
  BEFORE UPDATE ON public.reading_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 