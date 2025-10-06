-- Crear el registro del jugador para que aparezca en la pestaña correcta
INSERT INTO public.players (
  name,
  email,
  category_id,
  user_id,
  is_auth_enabled
) VALUES (
  'Maximiliano Bolbarán',
  'maximiliano.bolbaran@pregrado.uoh.cl',
  'bb814801-2627-4e7d-873a-7da41e41cd2a', -- sub 21
  '04bd50f2-2371-49d5-954d-11b0397f15ac',
  true
);