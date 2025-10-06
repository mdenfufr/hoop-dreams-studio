-- 1) Ensure bucket exists and is public
insert into storage.buckets (id, name, public)
values ('player-images', 'player-images', true)
on conflict (id) do update set public = true;

-- 2) Storage policies (idempotent)
-- Public read
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

-- List objects (authenticated)
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

-- Authenticated INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Insert player-images (auth)'
  ) THEN
    CREATE POLICY "Insert player-images (auth)"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'player-images');
  END IF;
END $$;

-- Authenticated UPDATE (e.g. overwrite with upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Update player-images (auth)'
  ) THEN
    CREATE POLICY "Update player-images (auth)"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'player-images')
    WITH CHECK (bucket_id = 'player-images');
  END IF;
END $$;

-- Authenticated DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Delete player-images (auth)'
  ) THEN
    CREATE POLICY "Delete player-images (auth)"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'player-images');
  END IF;
END $$;

-- 3) Sanitize image_url on players (always drop querystring)
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

-- 4) Validate image_url points to the expected bucket (defense-in-depth)
CREATE OR REPLACE FUNCTION public.validate_player_image_url()
RETURNS trigger AS $$
DECLARE
  clean TEXT;
BEGIN
  IF NEW.image_url IS NULL THEN
    RETURN NEW;
  END IF;
  clean := split_part(NEW.image_url, '?', 1);
  IF position('/storage/v1/object/public/player-images/' in clean) = 0 THEN
    RAISE EXCEPTION 'image_url must be a public URL from the "player-images" bucket';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_validate_player_image_url'
  ) THEN
    CREATE TRIGGER trg_validate_player_image_url
    BEFORE INSERT OR UPDATE ON public.players
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_player_image_url();
  END IF;
END $$;

-- 5) Block service_role from updating players.image_url (prevents silent changes without pressing "Guardar cambios")
CREATE OR REPLACE FUNCTION public.block_service_role_image_url_update()
RETURNS trigger AS $$
DECLARE
  jwt_role TEXT;
BEGIN
  -- Only check when image_url actually changes
  IF NEW.image_url IS DISTINCT FROM OLD.image_url THEN
    BEGIN
      jwt_role := COALESCE((auth.jwt() ->> 'role')::text, '');
    EXCEPTION WHEN OTHERS THEN
      jwt_role := '';
    END;

    IF jwt_role = 'service_role' THEN
      RAISE EXCEPTION 'Updating players.image_url via service role is not allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_block_service_role_image_url_update'
  ) THEN
    CREATE TRIGGER trg_block_service_role_image_url_update
    BEFORE UPDATE ON public.players
    FOR EACH ROW
    EXECUTE FUNCTION public.block_service_role_image_url_update();
  END IF;
END $$;

-- 6) Ensure updated_at bookkeeping exists on players (optional but useful)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_players_updated_at'
  ) THEN
    CREATE TRIGGER trg_players_updated_at
    BEFORE UPDATE ON public.players
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;