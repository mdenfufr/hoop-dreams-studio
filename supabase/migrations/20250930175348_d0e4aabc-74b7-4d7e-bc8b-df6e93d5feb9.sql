-- Ensure bucket 'player-images' exists and is public
insert into storage.buckets (id, name, public)
values ('player-images', 'player-images', true)
on conflict (id) do update set public = true;

-- Public read policy for player-images bucket (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Public read player-images'
  ) THEN
    CREATE POLICY "Public read player-images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'player-images');
  END IF;
END $$;

-- Optional: Allow authenticated users to list objects in player-images (not required for public URLs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'List player-images'
  ) THEN
    CREATE POLICY "List player-images"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'player-images');
  END IF;
END $$;

-- Sanitize image_url in players to always store clean URLs (no querystring)
CREATE OR REPLACE FUNCTION public.clean_image_url()
RETURNS trigger AS $$
BEGIN
  IF NEW.image_url IS NOT NULL THEN
    NEW.image_url := split_part(NEW.image_url, '?', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clean_player_image_url'
  ) THEN
    CREATE TRIGGER trg_clean_player_image_url
    BEFORE INSERT OR UPDATE ON public.players
    FOR EACH ROW
    EXECUTE FUNCTION public.clean_image_url();
  END IF;
END $$;