-- Corregir función handle_new_user - eliminar columna 'name' que no existe
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

  IF NEW.raw_user_meta_data ? 'category_id' AND NEW.raw_user_meta_data->>'category_id' <> '' THEN
    v_cat := (NEW.raw_user_meta_data->>'category_id')::uuid;
    SELECT organization_id INTO v_org_id FROM public.categories WHERE id = v_cat;
  ELSIF NEW.raw_user_meta_data ? 'senior_category_id' AND NEW.raw_user_meta_data->>'senior_category_id' <> '' THEN
    v_senior_cat := (NEW.raw_user_meta_data->>'senior_category_id')::uuid;
    SELECT organization_id INTO v_org_id FROM public.senior_categories WHERE id = v_senior_cat;
  ELSIF NEW.raw_user_meta_data ? 'organization_id' AND NEW.raw_user_meta_data->>'organization_id' <> '' THEN
    v_org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
  END IF;

  IF v_org_id IS NULL THEN
    v_org_id := v_default_org;
  END IF;

  -- Insertar SIN la columna 'name' que no existe
  INSERT INTO public.users (
    id, email,
    football_access, medical_players_access, medical_staff_access,
    physical_access, youth_records_access, staff_access, senior_football_access,
    organization_id, password_hash
  ) VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'football_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'medical_players_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'medical_staff_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'physical_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'youth_records_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'staff_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'senior_football_access', 'sin_acceso'),
    v_org_id,
    NEW.encrypted_password
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    football_access = EXCLUDED.football_access,
    medical_players_access = EXCLUDED.medical_players_access,
    medical_staff_access = EXCLUDED.medical_staff_access,
    physical_access = EXCLUDED.physical_access,
    youth_records_access = EXCLUDED.youth_records_access,
    staff_access = EXCLUDED.staff_access,
    senior_football_access = EXCLUDED.senior_football_access,
    organization_id = EXCLUDED.organization_id,
    password_hash = EXCLUDED.password_hash,
    updated_at = NOW();

  RETURN NEW;
END;
$function$;