-- Add last_read timestamps for unread indications
ALTER TABLE public.profiles
ADD COLUMN last_read_prayers_at TIMESTAMPTZ,
ADD COLUMN last_read_insights_at TIMESTAMPTZ;
