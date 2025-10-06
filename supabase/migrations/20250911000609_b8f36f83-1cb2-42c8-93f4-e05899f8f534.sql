-- Make category_id nullable for coaches table to support senior categories
ALTER TABLE public.coaches ALTER COLUMN category_id DROP NOT NULL;

-- Update coach_category_assignments to make category_id nullable 
ALTER TABLE public.coach_category_assignments ALTER COLUMN category_id DROP NOT NULL;

-- For matches table, ensure season_id is properly handled
-- Remove the NOT NULL constraint temporarily to fix the current issue
ALTER TABLE public.matches ALTER COLUMN season_id DROP NOT NULL;