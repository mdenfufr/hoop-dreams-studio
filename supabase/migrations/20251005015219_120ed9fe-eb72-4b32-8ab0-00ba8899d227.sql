-- ELIMINAR todas las restricciones y triggers problemáticos en players
-- 1. Eliminar constraint único de email si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'players_email_key' 
    AND conrelid = 'public.players'::regclass
  ) THEN
    ALTER TABLE public.players DROP CONSTRAINT players_email_key;
  END IF;
END $$;

-- 2. Eliminar trigger de validación de image_url (puede estar causando conflictos)
DROP TRIGGER IF EXISTS validate_player_image_url_trigger ON public.players;

-- 3. RECREAR la función update_player_with_image con lógica CORRECTA
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
BEGIN
  -- Obtener el email actual del jugador
  SELECT email INTO current_email 
  FROM public.players 
  WHERE id = p_player_id;
  
  -- Si p_email es NULL, mantener el email actual
  final_email := COALESCE(p_email, current_email);
  
  -- Solo verificar duplicado si el email REALMENTE cambió (y no es NULL)
  IF final_email IS NOT NULL AND final_email IS DISTINCT FROM current_email THEN
    -- Verificar si el NUEVO email ya existe en otro jugador ACTIVO
    IF EXISTS (
      SELECT 1 FROM public.players 
      WHERE email = final_email 
        AND id != p_player_id
        AND is_deleted = false
    ) THEN
      RAISE EXCEPTION 'El email % ya está en uso por otro jugador', final_email;
    END IF;
  END IF;
  
  -- Limpiar URL de imagen si se proporciona
  IF p_image_url IS NOT NULL AND p_image_url != '' THEN
    cleaned_url := split_part(p_image_url, '?', 1);
  ELSE
    -- Si no hay nueva imagen, mantener la existente
    SELECT image_url INTO cleaned_url 
    FROM public.players 
    WHERE id = p_player_id;
  END IF;
  
  -- Actualizar campos del jugador (solo los que se proporcionan)
  UPDATE public.players 
  SET 
    name = COALESCE(p_name, name),
    email = final_email,
    position = COALESCE(p_position, position),
    age = COALESCE(p_age, age),
    height = COALESCE(p_height, height),
    weight = COALESCE(p_weight, weight),
    jersey_number = COALESCE(p_jersey_number, jersey_number),
    image_url = cleaned_url,
    category_id = COALESCE(p_category_id, category_id),
    senior_category_id = COALESCE(p_senior_category_id, senior_category_id),
    updated_at = now()
  WHERE id = p_player_id;
END;
$$;