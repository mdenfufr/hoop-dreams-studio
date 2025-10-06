-- Update the handle_new_user function to include senior_football_access
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
    staff_access
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
    COALESCE(NEW.raw_user_meta_data->>'staff_access', 'sin_acceso')
  );
  RETURN NEW;
END;
$function$;