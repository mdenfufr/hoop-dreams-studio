-- Update the handle_new_player_user trigger to properly handle senior categories
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
      senior_category_id,
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