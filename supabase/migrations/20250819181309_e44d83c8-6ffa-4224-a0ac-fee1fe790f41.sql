-- Arreglar políticas RLS faltantes para tablas de datasets
CREATE POLICY "Enable all operations for all users" ON public.anthropometry_datasets
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON public.resistance_datasets  
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON public.speed_datasets
FOR ALL USING (true) WITH CHECK (true);

-- Arreglar funciones añadiendo search_path para seguridad
CREATE OR REPLACE FUNCTION public.get_player_id_from_auth()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT id FROM public.players WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_player_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Check if this user was created with player context (has category_id in metadata)
  IF NEW.raw_user_meta_data ? 'category_id' AND NEW.raw_user_meta_data->>'category_id' != '' THEN
    -- Insert into players table
    INSERT INTO public.players (
      name,
      email,
      category_id,
      user_id,
      is_auth_enabled,
      position,
      age,
      height,
      weight,
      jersey_number,
      image_url
    ) VALUES (
      COALESCE(NEW.raw_user_meta_data->>'name', 'Jugador'),
      NEW.email,
      (NEW.raw_user_meta_data->>'category_id')::uuid,
      NEW.id,
      true,
      NEW.raw_user_meta_data->>'position',
      CASE 
        WHEN NEW.raw_user_meta_data->>'age' IS NOT NULL AND NEW.raw_user_meta_data->>'age' != '' 
        THEN (NEW.raw_user_meta_data->>'age')::integer 
        ELSE NULL 
      END,
      NEW.raw_user_meta_data->>'height',
      NEW.raw_user_meta_data->>'weight',
      NEW.raw_user_meta_data->>'jersey_number',
      NEW.raw_user_meta_data->>'image_url'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_password(user_id uuid, plain_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.users
  SET password_hash = plain_password
  WHERE id = user_id;
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_users_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    password_hash,
    football_access,
    medical_players_access,
    medical_staff_access,
    physical_access,
    youth_records_access,
    staff_access
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.encrypted_password,
    COALESCE(NEW.raw_user_meta_data->>'football_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'medical_players_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'medical_staff_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'physical_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'youth_records_access', 'sin_acceso'),
    COALESCE(NEW.raw_user_meta_data->>'staff_access', 'sin_acceso')
  );
  RETURN NEW;
END;
$$;

-- Crear función específica para eliminar jugadores de manera segura
CREATE OR REPLACE FUNCTION public.delete_player_and_user(player_id_param uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  player_record RECORD;
  result json;
BEGIN
  -- Verificar que el jugador existe
  SELECT * INTO player_record 
  FROM public.players 
  WHERE id = player_id_param AND is_deleted = false;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Jugador no encontrado');
  END IF;
  
  -- Marcar el jugador como eliminado (soft delete)
  UPDATE public.players 
  SET is_deleted = true, 
      updated_at = now()
  WHERE id = player_id_param;
  
  -- Si el jugador tiene user_id, también eliminar de la tabla users
  IF player_record.user_id IS NOT NULL THEN
    DELETE FROM public.users WHERE id = player_record.user_id;
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Jugador eliminado correctamente',
    'player_id', player_id_param,
    'user_id', player_record.user_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Error al eliminar jugador: ' || SQLERRM
    );
END;
$$;

-- Crear función para verificar permisos de staff
CREATE OR REPLACE FUNCTION public.get_user_staff_access()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 STABLE
 SET search_path TO 'public'
AS $$
  SELECT staff_access FROM public.users WHERE id = auth.uid();
$$;