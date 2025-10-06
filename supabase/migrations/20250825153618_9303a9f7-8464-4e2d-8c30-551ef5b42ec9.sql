-- 1) Agregar columna response_date y backfill, más restricción única por jugador/día
ALTER TABLE public.wellness_responses
  ADD COLUMN IF NOT EXISTS response_date date;

UPDATE public.wellness_responses
SET response_date = (created_at AT TIME ZONE 'utc')::date
WHERE response_date IS NULL;

ALTER TABLE public.wellness_responses
  ALTER COLUMN response_date SET NOT NULL;

ALTER TABLE public.wellness_responses
  ALTER COLUMN response_date SET DEFAULT (timezone('utc'::text, now()))::date;

-- Índice único (ignora filas sin player_id)
DROP INDEX IF EXISTS ux_wellness_player_date;
CREATE UNIQUE INDEX ux_wellness_player_date
  ON public.wellness_responses (player_id, response_date)
  WHERE player_id IS NOT NULL;

-- 2) Política RLS para permitir UPDATE del propio jugador
DROP POLICY IF EXISTS "Players can update their own wellness responses" ON public.wellness_responses;
CREATE POLICY "Players can update their own wellness responses"
ON public.wellness_responses
FOR UPDATE
USING (
  player_id IN (
    SELECT players.id FROM players WHERE players.user_id = auth.uid()
  )
);

-- 3) Deduplicar respuestas de Renato, dejando solo la primera por día
WITH renato AS (
  SELECT p.id AS player_id
  FROM public.players p
  WHERE lower(p.email) = 'renato.martinez@pregrado.uoh.cl'
  LIMIT 1
),
first_per_day AS (
  SELECT DISTINCT ON (wr.response_date) wr.id
  FROM public.wellness_responses wr
  JOIN renato r ON wr.player_id = r.player_id
  ORDER BY wr.response_date, wr.created_at ASC
)
DELETE FROM public.wellness_responses wr
USING renato r
WHERE wr.player_id = r.player_id
AND wr.id NOT IN (SELECT id FROM first_per_day);