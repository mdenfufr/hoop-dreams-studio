-- Actualizar la función handle_player_email_reuse para validación global entre youth y senior football
CREATE OR REPLACE FUNCTION public.handle_player_email_reuse(
  p_email text, 
  p_name text, 
  p_age integer, 
  p_height text, 
  p_weight text, 
  p_position text, 
  p_image_url text, 
  p_jersey_number text, 
  p_category_id uuid, 
  p_senior_category_id uuid, 
  p_password text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  existing_user_id uuid;
  existing_player_record RECORD;
  new_player_id uuid;
  result json;
BEGIN
  -- Verificar si existe un usuario con este correo
  SELECT id INTO existing_user_id 
  FROM public.users 
  WHERE email = p_email;
  
  IF existing_user_id IS NOT NULL THEN
    -- VALIDACIÓN GLOBAL: Verificar si hay CUALQUIER jugador activo (no eliminado) con este correo
    -- en CUALQUIER categoría (youth o senior)
    SELECT * INTO existing_player_record
    FROM public.players 
    WHERE email = p_email 
    AND is_deleted = false
    LIMIT 1;
    
    IF existing_player_record IS NOT NULL THEN
      -- Ya existe un jugador activo con este correo en el sistema (youth o senior)
      RETURN json_build_object(
        'success', false,
        'error', 'email_in_use',
        'message', 'Este correo ya está asociado al jugador activo "' || existing_player_record.name || '". Por favor use un correo diferente.',
        'existing_player_name', existing_player_record.name
      );
    ELSE
      -- El correo existe pero no hay jugador activo, podemos reutilizarlo
      -- Crear nuevo jugador asociado al usuario existente
      INSERT INTO public.players (
        name, age, height, weight, position, image_url, jersey_number,
        email, user_id, is_auth_enabled, is_deleted,
        category_id, senior_category_id
      ) VALUES (
        p_name, p_age, p_height, p_weight, p_position, p_image_url, p_jersey_number,
        p_email, existing_user_id, true, false,
        p_category_id, p_senior_category_id
      ) RETURNING id INTO new_player_id;
      
      -- Actualizar contraseña si se proporciona
      IF p_password IS NOT NULL THEN
        UPDATE public.users 
        SET password_hash = p_password 
        WHERE id = existing_user_id;
      END IF;
      
      RETURN json_build_object(
        'success', true,
        'message', 'Cuenta reutilizada exitosamente',
        'player_id', new_player_id,
        'user_id', existing_user_id,
        'reused_account', true
      );
    END IF;
  ELSE
    -- VALIDACIÓN ADICIONAL: Antes de crear nuevo usuario, verificar que no exista 
    -- un jugador con este correo sin user_id (jugador sin autenticación)
    SELECT * INTO existing_player_record
    FROM public.players 
    WHERE email = p_email 
    AND is_deleted = false
    LIMIT 1;
    
    IF existing_player_record IS NOT NULL THEN
      -- Existe un jugador sin autenticación con este correo
      RETURN json_build_object(
        'success', false,
        'error', 'email_in_use',
        'message', 'Este correo ya está asociado al jugador "' || existing_player_record.name || '". Por favor use un correo diferente.',
        'existing_player_name', existing_player_record.name
      );
    END IF;
    
    -- No existe usuario ni jugador con este correo, retornar para crear uno nuevo
    RETURN json_build_object(
      'success', true,
      'message', 'Correo disponible para nuevo usuario',
      'create_new_user', true
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Error al procesar la solicitud: ' || SQLERRM
    );
END;
$function$;

-- Actualizar la tabla player_category_assignments para soportar tanto youth como senior
ALTER TABLE public.player_category_assignments 
ALTER COLUMN category_id DROP NOT NULL;

ALTER TABLE public.player_category_assignments 
ADD COLUMN IF NOT EXISTS senior_category_id uuid REFERENCES public.senior_categories(id);

ALTER TABLE public.player_category_assignments 
ADD COLUMN IF NOT EXISTS senior_season_id uuid REFERENCES public.senior_seasons(id);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_player_category_assignments_youth 
ON public.player_category_assignments(player_id, category_id, season_id) 
WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_player_category_assignments_senior 
ON public.player_category_assignments(player_id, senior_category_id, senior_season_id) 
WHERE senior_category_id IS NOT NULL;

-- Crear constraint para asegurar que se use youth O senior, no ambos
ALTER TABLE public.player_category_assignments 
ADD CONSTRAINT chk_category_assignment_type 
CHECK (
  (category_id IS NOT NULL AND senior_category_id IS NULL) OR 
  (category_id IS NULL AND senior_category_id IS NOT NULL)
);