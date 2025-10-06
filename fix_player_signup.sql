-- Ejecutar como migración/patch en Supabase (SQL Editor) y aprobar
-- Objetivo: restaurar alta de jugadores como funcionaba el 16/09/2025
-- 1) Triggers idempotentes para auth.users -> public.users y public.players
-- 2) Asignación correcta de organization_id (con fallback O'Higgins)
-- 3) RPC handle_player_email_reuse usada por el frontend para evitar conflictos

-- ===============================
-- CONFIGURACIÓN
-- ===============================
-- Org por defecto si no se puede derivar desde categoría/senior categoría
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_type t
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'uuid' AND n.nspname = 'pg_catalog'
  ) THEN
    RAISE EXCEPTION 'El tipo uuid debe existir';
  END IF;
END $$;

-- ===============================
-- FUNCIÓN: handle_new_player_user (idempotente)
-- ===============================
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
  v_default_org uuid := 'c63c6669-d96e-4997-afc8-23a3bcda0c96'::uuid; -- O'Higgins
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
  ELSIF NEW.raw_user_meta_data ? 'organization_id' AND NEW.raw_user_meta_data->>'organization_id' <> '' THEN
    v_org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
  END IF;

  -- Fallback de organización
  IF v_org_id IS NULL THEN
    v_org_id := v_default_org;
  END IF;

  -- Edad opcional
  IF NEW.raw_user_meta_data ? 'age' AND NEW.raw_user_meta_data->>'age' <> '' THEN
    BEGIN
      v_age := (NEW.raw_user_meta_data->>'age')::integer;
    EXCEPTION WHEN OTHERS THEN
      v_age := NULL;
    END;
  END IF;

  -- Inserción idempotente del jugador asociando el user_id que se acaba de crear
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
    COALESCE(NEW.raw_user_meta_data->>'name', COALESCE(NEW.email, 'Jugador')),
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
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    category_id = COALESCE(EXCLUDED.category_id, public.players.category_id),
    senior_category_id = COALESCE(EXCLUDED.senior_category_id, public.players.senior_category_id),
    is_auth_enabled = true,
    position = COALESCE(EXCLUDED.position, public.players.position),
    age = COALESCE(EXCLUDED.age, public.players.age),
    height = COALESCE(EXCLUDED.height, public.players.height),
    weight = COALESCE(EXCLUDED.weight, public.players.weight),
    jersey_number = COALESCE(EXCLUDED.jersey_number, public.players.jersey_number),
    image_url = COALESCE(EXCLUDED.image_url, public.players.image_url),
    organization_id = COALESCE(EXCLUDED.organization_id, public.players.organization_id);

  RETURN NEW;
END;
$$;

-- Trigger de creación de jugador desde auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_player ON auth.users;
CREATE TRIGGER on_auth_user_created_player
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_player_user();

-- ===============================
-- FUNCIÓN: handle_new_user (idempotente + org por defecto)
-- ===============================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_cat uuid;
  v_senior_cat uuid;
  v_default_org uuid := 'c63c6669-d96e-4997-afc8-23a3bcda0c96'::uuid; -- O'Higgins
BEGIN
  v_org_id := NULL;

  -- Derivar organización desde metadatos
  IF NEW.raw_user_meta_data ? 'category_id' AND NEW.raw_user_meta_data->>'category_id' <> '' THEN
    v_cat := (NEW.raw_user_meta_data->>'category_id')::uuid;
    SELECT organization_id INTO v_org_id FROM public.categories WHERE id = v_cat;
  ELSIF NEW.raw_user_meta_data ? 'senior_category_id' AND NEW.raw_user_meta_data->>'senior_category_id' <> '' THEN
    v_senior_cat := (NEW.raw_user_meta_data->>'senior_category_id')::uuid;
    SELECT organization_id INTO v_org_id FROM public.senior_categories WHERE id = v_senior_cat;
  ELSIF NEW.raw_user_meta_data ? 'organization_id' AND NEW.raw_user_meta_data->>'organization_id' <> '' THEN
    v_org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
  END IF;

  -- Fallback O'Higgins si no se pudo derivar
  IF v_org_id IS NULL THEN
    v_org_id := v_default_org;
  END IF;

  -- Insertar o actualizar el usuario en public.users
  INSERT INTO public.users (
    id,
    email,
    name,
    football_access,
    medical_players_access,
    medical_staff_access,
    physical_access,
    youth_records_access,
    staff_access,
    senior_football_access,
    organization_id
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'football_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'medical_players_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'medical_staff_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'physical_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'youth_records_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'staff_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'senior_football_access', 'sin_acceso'),
    v_org_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    football_access = EXCLUDED.football_access,
    medical_players_access = EXCLUDED.medical_players_access,
    medical_staff_access = EXCLUDED.medical_staff_access,
    physical_access = EXCLUDED.physical_access,
    youth_records_access = EXCLUDED.youth_records_access,
    staff_access = EXCLUDED.staff_access,
    senior_football_access = EXCLUDED.senior_football_access,
    organization_id = EXCLUDED.organization_id,
    updated_at = NOW();

  RETURN NEW;
END;
$function$;

-- Trigger de sincronización de public.users desde auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ===============================
-- RPC: handle_player_email_reuse
-- ===============================
-- Determina si se debe crear un usuario nuevo o reutilizar uno existente;
-- si se reutiliza, crea el registro en public.players enlazando el user_id.
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
  p_password text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_existing_player uuid;
  v_org_id uuid;
  v_default_org uuid := 'c63c6669-d96e-4997-afc8-23a3bcda0c96'::uuid; -- O'Higgins
BEGIN
  -- Derivar organización
  IF p_category_id IS NOT NULL THEN
    SELECT organization_id INTO v_org_id FROM public.categories WHERE id = p_category_id;
  ELSIF p_senior_category_id IS NOT NULL THEN
    SELECT organization_id INTO v_org_id FROM public.senior_categories WHERE id = p_senior_category_id;
  END IF;
  IF v_org_id IS NULL THEN
    v_org_id := v_default_org;
  END IF;

  -- Buscar usuario por email en auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;

  IF v_user_id IS NULL THEN
    -- No hay cuenta -> el frontend debe crear usuario (auth.signUp)
    RETURN jsonb_build_object(
      'success', true,
      'create_new_user', true
    );
  END IF;

  -- Ya existe cuenta; validar si ya hay jugador activo con ese email en la misma organización
  SELECT id INTO v_existing_player
  FROM public.players
  WHERE lower(email) = lower(p_email)
    AND (organization_id = v_org_id OR v_org_id IS NULL)
  LIMIT 1;

  IF v_existing_player IS NOT NULL THEN
    -- Email ya ligado a un jugador existente
    RETURN jsonb_build_object(
      'success', false,
      'error', 'email_in_use',
      'message', 'Este correo ya está asociado a un jugador.'
    );
  END IF;

  -- Reutilizar cuenta existente creando el registro de jugador
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
    COALESCE(p_name, p_email),
    p_email,
    p_category_id,
    p_senior_category_id,
    v_user_id,
    true,
    p_position,
    p_age,
    p_height,
    p_weight,
    p_jersey_number,
    p_image_url,
    v_org_id
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'reused_account', true
  );
END;
$$;
