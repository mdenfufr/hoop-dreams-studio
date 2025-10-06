-- Restore previous behavior: attach triggers on auth.users and fix player creation functions

-- 1) Ensure functions create players and users correctly with organization_id
CREATE OR REPLACE FUNCTION public.handle_new_player_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

  -- Determine category and organization from metadata
  IF NEW.raw_user_meta_data ? 'category_id' AND NEW.raw_user_meta_data->>'category_id' != '' THEN
    v_category_id := (NEW.raw_user_meta_data->>'category_id')::uuid;
    SELECT organization_id INTO v_org_id FROM public.categories WHERE id = v_category_id;
  ELSIF NEW.raw_user_meta_data ? 'senior_category_id' AND NEW.raw_user_meta_data->>'senior_category_id' != '' THEN
    v_senior_category_id := (NEW.raw_user_meta_data->>'senior_category_id')::uuid;
    SELECT organization_id INTO v_org_id FROM public.senior_categories WHERE id = v_senior_category_id;
  END IF;

  -- Parse optional age
  IF NEW.raw_user_meta_data ? 'age' AND NEW.raw_user_meta_data->>'age' != '' THEN
    v_age := (NEW.raw_user_meta_data->>'age')::integer;
  ELSE
    v_age := NULL;
  END IF;

  -- Insert player linked to the new auth user
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

-- Also ensure email reuse flow assigns organization_id to players
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
SET search_path = 'public'
AS $$
DECLARE
  existing_user_id uuid;
  existing_player_record RECORD;
  new_player_id uuid;
  result json;
  v_org_id uuid;
BEGIN
  -- Compute organization from provided category ids
  v_org_id := NULL;
  IF p_category_id IS NOT NULL THEN
    SELECT organization_id INTO v_org_id FROM public.categories WHERE id = p_category_id;
  ELSIF p_senior_category_id IS NOT NULL THEN
    SELECT organization_id INTO v_org_id FROM public.senior_categories WHERE id = p_senior_category_id;
  END IF;

  -- Check existing user
  SELECT id INTO existing_user_id 
  FROM public.users 
  WHERE email = p_email;
  
  IF existing_user_id IS NOT NULL THEN
    -- Check any active player with this email
    SELECT * INTO existing_player_record
    FROM public.players 
    WHERE email = p_email 
      AND is_deleted = false
    LIMIT 1;
    
    IF existing_player_record IS NOT NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'email_in_use',
        'message', 'Este correo ya está asociado al jugador activo "' || existing_player_record.name || '". Por favor use un correo diferente.',
        'existing_player_name', existing_player_record.name
      );
    ELSE
      -- Reuse account: create new player linked to existing user
      INSERT INTO public.players (
        name, age, height, weight, position, image_url, jersey_number,
        email, user_id, is_auth_enabled, is_deleted,
        category_id, senior_category_id, organization_id
      ) VALUES (
        p_name, p_age, p_height, p_weight, p_position, p_image_url, p_jersey_number,
        p_email, existing_user_id, true, false,
        p_category_id, p_senior_category_id, v_org_id
      ) RETURNING id INTO new_player_id;
      
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
    -- No user nor player with this email exists
    SELECT * INTO existing_player_record
    FROM public.players 
    WHERE email = p_email 
      AND is_deleted = false
    LIMIT 1;
    
    IF existing_player_record IS NOT NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'email_in_use',
        'message', 'Este correo ya está asociado al jugador "' || existing_player_record.name || '". Por favor use un correo diferente.',
        'existing_player_name', existing_player_record.name
      );
    END IF;
    
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

-- 2) Re-attach triggers on auth.users to restore automatic syncing
DROP TRIGGER IF EXISTS on_auth_user_created_public_users ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_players ON auth.users;

CREATE TRIGGER on_auth_user_created_public_users
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_players
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_player_user();
