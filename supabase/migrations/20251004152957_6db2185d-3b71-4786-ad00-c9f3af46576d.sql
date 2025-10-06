-- Eliminar el constraint único de email que está bloqueando las actualizaciones
ALTER TABLE public.players 
DROP CONSTRAINT IF EXISTS players_email_key;

-- Recrear la función con validación de duplicados
DROP FUNCTION IF EXISTS public.update_player_with_image(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.update_player_with_image(
  p_player_id uuid,
  p_name text,
  p_email text,
  p_image_url text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  cleaned_url text;
  current_email text;
BEGIN
  -- Obtener el email actual del jugador
  SELECT email INTO current_email 
  FROM public.players 
  WHERE id = p_player_id;
  
  -- Solo verificar duplicado si el email CAMBIÓ
  IF p_email != current_email OR current_email IS NULL THEN
    -- Verificar si el NUEVO email ya existe en otro jugador
    IF EXISTS (
      SELECT 1 FROM public.players 
      WHERE email = p_email AND id != p_player_id
    ) THEN
      RAISE EXCEPTION 'El email % ya está en uso por otro jugador', p_email;
    END IF;
  END IF;
  
  -- Limpiar URL de imagen si se proporciona
  IF p_image_url IS NOT NULL THEN
    cleaned_url := split_part(p_image_url, '?', 1);
  ELSE
    -- Si no hay nueva imagen, mantener la existente
    SELECT image_url INTO cleaned_url 
    FROM public.players 
    WHERE id = p_player_id;
  END IF;
  
  -- Actualizar el jugador
  UPDATE public.players 
  SET 
    name = p_name,
    email = p_email,
    image_url = cleaned_url,
    updated_at = now()
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;