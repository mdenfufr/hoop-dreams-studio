-- Enforzar unicidad global de correo de jugadores activos (youth y senior)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_player_email
ON public.players (lower(email))
WHERE email IS NOT NULL AND is_deleted = false;