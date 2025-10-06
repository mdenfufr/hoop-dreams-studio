-- Create senior_seasons table for senior football team
CREATE TABLE public.senior_seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  name TEXT NOT NULL
);

-- Create senior_categories table for senior football team  
CREATE TABLE public.senior_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  senior_season_id UUID NOT NULL REFERENCES public.senior_seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.senior_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.senior_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for senior_seasons (same as existing seasons policies)
CREATE POLICY "Enable all operations for all users" 
ON public.senior_seasons 
FOR ALL 
USING (true);

-- Create policies for senior_categories (same as existing categories policies)
CREATE POLICY "Enable all operations for all users" 
ON public.senior_categories 
FOR ALL 
USING (true);

-- Add senior_category_id column to players table to support both youth and senior categories
ALTER TABLE public.players ADD COLUMN senior_category_id UUID REFERENCES public.senior_categories(id) ON DELETE SET NULL;

-- Add senior_season_id column to matches table to support both youth and senior seasons
ALTER TABLE public.matches ADD COLUMN senior_season_id UUID REFERENCES public.senior_seasons(id) ON DELETE SET NULL;
ALTER TABLE public.matches ADD COLUMN senior_category_id UUID REFERENCES public.senior_categories(id) ON DELETE SET NULL;

-- Add senior_season_id and senior_category_id to complementary_materials table
ALTER TABLE public.complementary_materials ADD COLUMN senior_season_id UUID REFERENCES public.senior_seasons(id) ON DELETE SET NULL;
ALTER TABLE public.complementary_materials ADD COLUMN senior_category_id UUID REFERENCES public.senior_categories(id) ON DELETE SET NULL;

-- Update coaches table to support senior categories
ALTER TABLE public.coaches ADD COLUMN senior_category_id UUID REFERENCES public.senior_categories(id) ON DELETE SET NULL;

-- Update coach_category_assignments to support senior categories
ALTER TABLE public.coach_category_assignments ADD COLUMN senior_category_id UUID REFERENCES public.senior_categories(id) ON DELETE SET NULL;