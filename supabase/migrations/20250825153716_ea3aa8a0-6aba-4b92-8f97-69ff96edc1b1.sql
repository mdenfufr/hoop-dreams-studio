-- 1) Agregar columna response_date y backfill
ALTER TABLE public.wellness_responses
  ADD COLUMN IF NOT EXISTS response_date date;

UPDATE public.wellness_responses
SET response_date = (created_at AT TIME ZONE 'utc')::date
WHERE response_date IS NULL;

ALTER TABLE public.wellness_responses
  ALTER COLUMN response_date SET NOT NULL;

ALTER TABLE public.wellness_responses
  ALTER COLUMN response_date SET DEFAULT (timezone('utc'::text, now()))::date;

-- 2) Limpiar TODOS los duplicados (mantener el más antiguo por jugador/día)
WITH duplicates_to_delete AS (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY player_id, response_date 
             ORDER BY created_at ASC
           ) as rn
    FROM public.wellness_responses
    WHERE player_id IS NOT NULL
  ) ranked
  WHERE rn > 1
)
DELETE FROM public.wellness_responses
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- 3) Crear índice único por jugador/día
DROP INDEX IF EXISTS ux_wellness_player_date;
CREATE UNIQUE INDEX ux_wellness_player_date
  ON public.wellness_responses (player_id, response_date)
  WHERE player_id IS NOT NULL;

-- 4) Política RLS para permitir UPDATE del propio jugador
DROP POLICY IF EXISTS "Players can update their own wellness responses" ON public.wellness_responses;
CREATE POLICY "Players can update their own wellness responses"
ON public.wellness_responses
FOR UPDATE
USING (
  player_id IN (
    SELECT players.id FROM players WHERE players.user_id = auth.uid()
  )
);