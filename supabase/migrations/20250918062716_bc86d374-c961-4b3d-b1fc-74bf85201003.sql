-- Create function to create both public.users and public.players after a successful sign-up
CREATE OR REPLACE FUNCTION public.create_player_and_user(
  p_auth_user_id uuid,
  p_email text,
  p_name text,
  p_position text,
  p_age integer,
  p_height text,
  p_weight text,
  p_jersey_number text,
  p_image_url text,
  p_category_id uuid,
  p_senior_category_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_player_id uuid;
BEGIN
  v_org_id := NULL;
  IF p_category_id IS NOT NULL THEN
    SELECT organization_id INTO v_org_id FROM public.categories WHERE id = p_category_id;
  ELSIF p_senior_category_id IS NOT NULL THEN
    SELECT organization_id INTO v_org_id FROM public.senior_categories WHERE id = p_senior_category_id;
  END IF;

  -- Insert into public.users if missing
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_auth_user_id) THEN
    INSERT INTO public.users (
      id, email, password_hash,
      senior_football_access, football_access, medical_players_access, medical_staff_access, physical_access, youth_records_access, staff_access,
      organization_id, created_at, updated_at
    ) VALUES (
      p_auth_user_id, p_email, NULL,
      'sin_acceso','sin_acceso','editor','sin_acceso','sin_acceso','sin_acceso','sin_acceso',
      v_org_id, timezone('utc', now()), timezone('utc', now())
    );
  ELSE
    UPDATE public.users
      SET organization_id = COALESCE(organization_id, v_org_id),
          updated_at = timezone('utc', now())
    WHERE id = p_auth_user_id;
  END IF;

  -- Insert into public.players
  INSERT INTO public.players (
    name, age, height, weight, position, image_url, jersey_number,
    email, user_id, is_auth_enabled, is_deleted,
    category_id, senior_category_id, organization_id
  ) VALUES (
    p_name, p_age, p_height, p_weight, p_position, p_image_url, p_jersey_number,
    p_email, p_auth_user_id, true, false,
    p_category_id, p_senior_category_id, v_org_id
  )
  RETURNING id INTO v_player_id;

  RETURN json_build_object('success', true, 'player_id', v_player_id, 'user_id', p_auth_user_id, 'organization_id', v_org_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Error al crear registros: ' || SQLERRM);
END;
$$;