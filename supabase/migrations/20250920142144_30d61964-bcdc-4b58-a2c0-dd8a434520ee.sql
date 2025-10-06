-- Ajuste: Crear/actualizar función handle_new_user para asignar organization_id desde metadatos
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

  -- Insertar perfil en tabla public.users con organización derivada
  INSERT INTO public.users (
    id, 
    email, 
    password_hash,
    senior_football_access,
    football_access,
    medical_players_access,
    medical_staff_access,
    physical_access,
    youth_records_access,
    staff_access,
    organization_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.encrypted_password,
    COALESCE(NEW.raw_user_meta_data->>'senior_football_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'football_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'medical_players_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'medical_staff_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'physical_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'youth_records_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'staff_access', 'sin_acceso'),
    v_org_id
  );

  RETURN NEW;
END;
$function$;