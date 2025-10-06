-- Separate molestia muscular description from ailments by adding a dedicated column
ALTER TABLE public.body_pain_responses
ADD COLUMN IF NOT EXISTS description TEXT;

-- Backfill missing organization_id for existing datasets to O'Higgins
UPDATE public.anthropometry_datasets SET organization_id = 'c63c6669-d96e-4997-afc8-23a3bcda0c96' WHERE organization_id IS NULL;
UPDATE public.speed_datasets SET organization_id = 'c63c6669-d96e-4997-afc8-23a3bcda0c96' WHERE organization_id IS NULL;
UPDATE public.resistance_datasets SET organization_id = 'c63c6669-d96e-4997-afc8-23a3bcda0c96' WHERE organization_id IS NULL;
UPDATE public.force_datasets SET organization_id = 'c63c6669-d96e-4997-afc8-23a3bcda0c96' WHERE organization_id IS NULL;
UPDATE public.gps_datasets SET organization_id = 'c63c6669-d96e-4997-afc8-23a3bcda0c96' WHERE organization_id IS NULL;