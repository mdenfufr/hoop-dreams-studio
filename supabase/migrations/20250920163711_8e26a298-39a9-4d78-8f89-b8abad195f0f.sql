-- Actualizar función handle_new_player_user para BLOQUEAR emails duplicados
CREATE OR REPLACE FUNCTION public.handle_new_player_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_category_id uuid;
  v_senior_category_id uuid;
  v_org_id uuid;
  v_age integer;
  existing_player_count integer;
  existing_user_count integer;
BEGIN
  -- VALIDAR que no exista ya un jugador activo con este email
  SELECT COUNT(*) INTO existing_player_count
  FROM public.players 
  WHERE email = NEW.email 
    AND is_deleted = false;
  
  IF existing_player_count > 0 THEN
    RAISE EXCEPTION 'Ya existe un jugador activo con el email: %', NEW.email;
  END IF;

  -- VALIDAR que no exista ya un usuario con este email
  SELECT COUNT(*) INTO existing_user_count
  FROM public.users 
  WHERE email = NEW.email;
  
  IF existing_user_count > 0 THEN
    RAISE EXCEPTION 'Ya existe un usuario registrado con el email: %', NEW.email;
  END IF;

  v_category_id := NULL;
  v_senior_category_id := NULL;
  v_org_id := NULL;

  -- Determinar categoría y organización desde metadatos
  IF NEW.raw_user_meta_data ? 'category_id' AND NEW.raw_user_meta_data->>'category_id' != '' THEN
    v_category_id := (NEW.raw_user_meta_data->>'category_id')::uuid;
    SELECT organization_id INTO v_org_id FROM public.categories WHERE id = v_category_id;
  ELSIF NEW.raw_user_meta_data ? 'senior_category_id' AND NEW.raw_user_meta_data->>'senior_category_id' != '' THEN
    v_senior_category_id := (NEW.raw_user_meta_data->>'senior_category_id')::uuid;
    SELECT organization_id INTO v_org_id FROM public.senior_categories WHERE id = v_senior_category_id;
  END IF;

  -- Parsear edad opcional
  IF NEW.raw_user_meta_data ? 'age' AND NEW.raw_user_meta_data->>'age' != '' THEN
    v_age := (NEW.raw_user_meta_data->>'age')::integer;
  ELSE
    v_age := NULL;
  END IF;

  -- Insertar jugador vinculado al nuevo usuario auth
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
$function$;