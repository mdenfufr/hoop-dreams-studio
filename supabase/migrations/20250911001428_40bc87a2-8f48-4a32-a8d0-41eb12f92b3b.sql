-- Remove the NOT NULL constraint from season_id for matches table to allow senior matches without youth season
ALTER TABLE public.matches ALTER COLUMN season_id DROP NOT NULL;

-- Update existing senior matches to have NULL season_id since they use senior_season_id instead
UPDATE public.matches 
SET season_id = NULL 
WHERE senior_season_id IS NOT NULL;