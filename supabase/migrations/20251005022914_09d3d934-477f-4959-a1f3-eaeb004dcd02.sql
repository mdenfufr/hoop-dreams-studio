-- Solución completa para el problema de actualización de imágenes de jugadores

-- 1. Recrear la función update_player_with_image con manejo correcto de cadenas vacías
DROP FUNCTION IF EXISTS public.update_player_with_image(uuid, text, text, text, integer, text, text, text, text, uuid, uuid);

CREATE OR REPLACE FUNCTION public.update_player_with_image(
  p_player_id uuid,
  p_name text,
  p_email text DEFAULT NULL,
  p_position text DEFAULT NULL,
  p_age integer DEFAULT NULL,
  p_height text DEFAULT NULL,
  p_weight text DEFAULT NULL,
  p_jersey_number text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_senior_category_id uuid DEFAULT NULL
)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned_url text;
  current_email text;
  final_email text;
  v_current_player RECORD;
BEGIN
  -- Obtener datos actuales del jugador
  SELECT * INTO v_current_player
  FROM public.players 
  WHERE id = p_player_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jugador no encontrado';
  END IF;
  
  -- Manejar email: tratar cadenas vacías como NULL
  IF p_email IS NULL OR trim(p_email) = '' THEN
    final_email := v_current_player.email;
  ELSE
    final_email := trim(p_email);
    
    -- Solo verificar duplicado si el email REALMENTE cambió
    IF final_email IS DISTINCT FROM v_current_player.email THEN
      IF EXISTS (
        SELECT 1 FROM public.players 
        WHERE email = final_email 
          AND id != p_player_id
          AND is_deleted = false
      ) THEN
        RAISE EXCEPTION 'El email % ya está en uso por otro jugador', final_email;
      END IF;
    END IF;
  END IF;
  
  -- Manejar URL de imagen: limpiar parámetros de query y tratar cadenas vacías
  IF p_image_url IS NOT NULL AND trim(p_image_url) != '' THEN
    cleaned_url := split_part(trim(p_image_url), '?', 1);
  ELSE
    cleaned_url := v_current_player.image_url;
  END IF;
  
  -- Actualizar solo los campos proporcionados (usar valores actuales si el parámetro es NULL)
  UPDATE public.players 
  SET 
    name = COALESCE(NULLIF(trim(p_name), ''), v_current_player.name),
    email = final_email,
    position = COALESCE(NULLIF(trim(p_position), ''), v_current_player.position),
    age = COALESCE(p_age, v_current_player.age),
    height = COALESCE(NULLIF(trim(p_height), ''), v_current_player.height),
    weight = COALESCE(NULLIF(trim(p_weight), ''), v_current_player.weight),
    jersey_number = COALESCE(NULLIF(trim(p_jersey_number), ''), v_current_player.jersey_number),
    image_url = cleaned_url,
    category_id = COALESCE(p_category_id, v_current_player.category_id),
    senior_category_id = COALESCE(p_senior_category_id, v_current_player.senior_category_id),
    updated_at = now()
  WHERE id = p_player_id;
  
  RAISE NOTICE 'Jugador actualizado exitosamente: %', p_player_id;
END;
$$;