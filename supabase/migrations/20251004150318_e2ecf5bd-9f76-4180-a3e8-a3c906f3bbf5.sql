-- Migración única para manejo correcto de imágenes de jugadores
-- La imagen solo se actualiza al presionar "Guardar cambios"

-- Asegurar que el bucket 'player-images' existe y es público
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-images', 'player-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Política de lectura pública para player-images (idempotente)
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

-- Política para usuarios autenticados subir imágenes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Authenticated upload player-images'
  ) THEN
    CREATE POLICY "Authenticated upload player-images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'player-images');
  END IF;
END $$;

-- Política para actualizar imágenes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Authenticated update player-images'
  ) THEN
    CREATE POLICY "Authenticated update player-images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'player-images');
  END IF;
END $$;

-- Política para eliminar imágenes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Authenticated delete player-images'
  ) THEN
    CREATE POLICY "Authenticated delete player-images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'player-images');
  END IF;
END $$;

-- REMOVER todos los triggers automáticos que limpian URLs
DROP TRIGGER IF EXISTS clean_image_url_trigger ON public.players;
DROP TRIGGER IF EXISTS trg_clean_player_image_url ON public.players;
DROP TRIGGER IF EXISTS update_players_updated_at ON public.players;

-- Eliminar función anterior si existe
DROP FUNCTION IF EXISTS public.clean_image_url();

-- Crear función manual para limpiar URL (se llamará explícitamente al guardar)
CREATE OR REPLACE FUNCTION public.clean_player_image_url(player_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.players 
  SET image_url = split_part(image_url, '?', 1),
      updated_at = timezone('utc', now())
  WHERE id = player_id AND image_url IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para manejar la actualización completa del jugador
CREATE OR REPLACE FUNCTION public.update_player_with_image(
  p_player_id uuid,
  p_name text,
  p_email text,
  p_position text DEFAULT NULL,
  p_age integer DEFAULT NULL,
  p_height text DEFAULT NULL,
  p_weight text DEFAULT NULL,
  p_jersey_number text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_senior_category_id uuid DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  cleaned_url text;
BEGIN
  -- Si se proporciona una nueva imagen, limpiar la URL
  IF p_image_url IS NOT NULL THEN
    cleaned_url := split_part(p_image_url, '?', 1);
  ELSE
    -- Mantener la imagen actual si no se proporciona una nueva
    SELECT image_url INTO cleaned_url FROM public.players WHERE id = p_player_id;
  END IF;
  
  -- Actualizar el jugador con todos los campos
  UPDATE public.players 
  SET 
    name = COALESCE(p_name, name),
    email = COALESCE(p_email, email),
    position = COALESCE(p_position, position),
    age = COALESCE(p_age, age),
    height = COALESCE(p_height, height),
    weight = COALESCE(p_weight, weight),
    jersey_number = COALESCE(p_jersey_number, jersey_number),
    image_url = cleaned_url,
    category_id = COALESCE(p_category_id, category_id),
    senior_category_id = COALESCE(p_senior_category_id, senior_category_id),
    updated_at = timezone('utc', now())
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;