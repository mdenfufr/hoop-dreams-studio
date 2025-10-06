-- Eliminar el trigger que limpia query strings de las URLs de imagen
-- Este trigger impedía el cache-busting necesario para visualizar imágenes actualizadas
DROP TRIGGER IF EXISTS clean_image_url_trigger ON public.players;

-- Opcional: Mantener la función por si se usa en otro lugar, pero comentada
-- Si no se usa en ningún otro lugar, se puede eliminar también:
-- DROP FUNCTION IF EXISTS public.clean_image_url();

-- Asegurar que el trigger de updated_at está activo para cache-busting
DROP TRIGGER IF EXISTS update_players_updated_at ON public.players;

CREATE TRIGGER update_players_updated_at
BEFORE UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();