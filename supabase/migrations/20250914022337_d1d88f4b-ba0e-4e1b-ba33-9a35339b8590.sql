-- Función para manejar la reutilización de correos de jugadores
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
  p_password text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- Verificar si hay un jugador activo (no eliminado) con este correo
    SELECT * INTO existing_player_record
    FROM public.players 
    WHERE email = p_email 
    AND is_deleted = false
    LIMIT 1;
    
    IF existing_player_record IS NOT NULL THEN
      -- Ya existe un jugador activo con este correo
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
    -- No existe usuario con este correo, retornar para crear uno nuevo
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
$$;