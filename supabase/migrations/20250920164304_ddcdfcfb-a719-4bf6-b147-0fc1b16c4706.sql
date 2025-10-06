-- 1) Reescribir handle_player_email_reuse para BLOQUEAR duplicados y NO reutilizar cuentas
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
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_user_id uuid;
  existing_player_record RECORD;
  v_org_id uuid;
BEGIN
  -- Calcular organización desde categoría si se provee
  v_org_id := NULL;
  IF p_category_id IS NOT NULL THEN
    SELECT organization_id INTO v_org_id FROM public.categories WHERE id = p_category_id;
  ELSIF p_senior_category_id IS NOT NULL THEN
    SELECT organization_id INTO v_org_id FROM public.senior_categories WHERE id = p_senior_category_id;
  END IF;

  -- ¿Existe usuario con este email?
  SELECT id INTO existing_user_id FROM public.users WHERE email = p_email;
  IF existing_user_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'email_in_use',
      'message', 'Este correo ya está registrado como usuario. Use un correo distinto.'
    );
  END IF;

  -- ¿Existe jugador activo con este email?
  SELECT * INTO existing_player_record
  FROM public.players
  WHERE email = p_email AND is_deleted = false
  LIMIT 1;

  IF existing_player_record IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'email_in_use',
      'message', 'Este correo ya está asociado a un jugador activo. Use un correo distinto.',
      'existing_player_name', existing_player_record.name
    );
  END IF;

  -- Correo disponible para crear nuevo usuario (signup manejará el resto)
  RETURN json_build_object(
    'success', true,
    'message', 'Correo disponible para nuevo usuario',
    'create_new_user', true,
    'organization_id', v_org_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'database_error',
    'message', 'Error al validar correo: ' || SQLERRM
  );
END;
$$;

-- 2) Reescribir handle_new_player_user para NO lanzar excepciones y solo insertar jugador
CREATE OR REPLACE FUNCTION public.handle_new_player_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_category_id uuid;
  v_senior_category_id uuid;
  v_org_id uuid;
  v_age integer;
BEGIN
  v_category_id := NULL;
  v_senior_category_id := NULL;
  v_org_id := NULL;
  v_age := NULL;

  -- Determinar categoría y organización desde metadatos
  IF NEW.raw_user_meta_data ? 'category_id' AND NEW.raw_user_meta_data->>'category_id' <> '' THEN
    v_category_id := (NEW.raw_user_meta_data->>'category_id')::uuid;
    SELECT organization_id INTO v_org_id FROM public.categories WHERE id = v_category_id;
  ELSIF NEW.raw_user_meta_data ? 'senior_category_id' AND NEW.raw_user_meta_data->>'senior_category_id' <> '' THEN
    v_senior_category_id := (NEW.raw_user_meta_data->>'senior_category_id')::uuid;
    SELECT organization_id INTO v_org_id FROM public.senior_categories WHERE id = v_senior_category_id;
  END IF;

  -- Edad opcional
  IF NEW.raw_user_meta_data ? 'age' AND NEW.raw_user_meta_data->>'age' <> '' THEN
    BEGIN
      v_age := (NEW.raw_user_meta_data->>'age')::integer;
    EXCEPTION WHEN OTHERS THEN
      v_age := NULL;
    END;
  END IF;

  -- Insertar jugador (evitar duplicados suaves con ON CONFLICT no aplica si no hay constraint)
  INSERT INTO public.players (
    name,
    email,
    category_id,
    senior_category_id,
    user_id,
    is_auth_enabled,
    position,
    age,
    height,
    weight,
    jersey_number,
    image_url,
    organization_id
  ) VALUES (
    COALESCE(NEW.raw_user_meta_data->>'name', 'Jugador'),
    NEW.email,
    v_category_id,
    v_senior_category_id,
    NEW.id,
    true,
    NEW.raw_user_meta_data->>'position',
    v_age,
    NEW.raw_user_meta_data->>'height',
    NEW.raw_user_meta_data->>'weight',
    NEW.raw_user_meta_data->>'jersey_number',
    NEW.raw_user_meta_data->>'image_url',
    v_org_id
  );

  RETURN NEW;
END;
$$;