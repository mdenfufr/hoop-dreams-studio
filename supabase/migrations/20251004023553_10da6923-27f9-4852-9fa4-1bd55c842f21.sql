-- 1) Ensure bucket exists and is public
insert into storage.buckets (id, name, public)
values ('player-images', 'player-images', true)
on conflict (id) do update set public = true;

-- 2) Public read policy for player-images bucket (idempotent)
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

-- (Optional) Keep a specific list policy for authenticated if not already existing
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

-- 3) Players.updated_at column (safe, idempotent)
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());

-- 4) Standard updated_at function and trigger (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_players_updated_at ON public.players;
CREATE TRIGGER trg_players_updated_at
BEFORE UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Clean image_url (remove query strings) (idempotent)
CREATE OR REPLACE FUNCTION public.clean_image_url()
RETURNS trigger AS $$
BEGIN
  IF NEW.image_url IS NOT NULL THEN
    NEW.image_url := split_part(NEW.image_url, '?', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_clean_player_image_url ON public.players;
CREATE TRIGGER trg_clean_player_image_url
BEFORE INSERT OR UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.clean_image_url();

-- 6) Validate image_url points to the public player-images URL (idempotent)
CREATE OR REPLACE FUNCTION public.validate_player_image_url()
RETURNS trigger AS $$
BEGIN
  IF NEW.image_url IS NULL OR length(trim(NEW.image_url)) = 0 THEN
    RETURN NEW; -- allow null/empty
  END IF;
  -- Must reference the public URL for the 'player-images' bucket
  IF position('/storage/v1/object/public/player-images/' IN NEW.image_url) = 0 THEN
    RAISE EXCEPTION 'image_url must be a public URL from player-images bucket';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_player_image_url ON public.players;
CREATE TRIGGER trg_validate_player_image_url
BEFORE INSERT OR UPDATE OF image_url ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.validate_player_image_url();

-- 7) Remove service-role-blocking trigger if it exists (it can prevent legitimate saves)
DROP TRIGGER IF EXISTS trg_block_service_role_image_url_update ON public.players;
DROP FUNCTION IF EXISTS public.block_service_role_image_url_update();