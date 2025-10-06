-- Arreglar función handle_new_user para manejar organizaciones correctamente
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid := 'c63c6669-d96e-4997-afc8-23a3bcda0c96'; -- OHiggins por defecto
BEGIN
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
    COALESCE(NEW.raw_user_meta_data->>'medical_players_access', 'editor'),
    COALESCE(NEW.raw_user_meta_data->>'medical_staff_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'physical_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'youth_records_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'staff_access', 'sin_acceso'),
    v_org_id
  );
  RETURN NEW;
END;
$function$;

-- Arreglar política RLS de matches para permitir inserción
DROP POLICY IF EXISTS "Users can manage matches within their organization" ON matches;

CREATE POLICY "Users can manage matches within their organization"
ON matches
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.organization_id = matches.organization_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.organization_id = matches.organization_id
  )
);

-- Asegurar que todas las tablas principales tengan políticas RLS que funcionen con organizaciones
DROP POLICY IF EXISTS "Users can manage categories within their organization" ON categories;

CREATE POLICY "Users can manage categories within their organization"
ON categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.organization_id = categories.organization_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.organization_id = categories.organization_id
  )
);

DROP POLICY IF EXISTS "Users can manage seasons within their organization" ON seasons;

CREATE POLICY "Users can manage seasons within their organization"
ON seasons
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.organization_id = seasons.organization_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.organization_id = seasons.organization_id
  )
);