-- Eliminar respuestas de wellness de jugadores no autenticados
DELETE FROM wellness_responses 
WHERE player_id IN (
  SELECT id FROM players WHERE user_id IS NULL
);

-- Crear una política más restrictiva para wellness_responses que solo permita jugadores autenticados
DROP POLICY IF EXISTS "Players can insert their own wellness responses" ON wellness_responses;

CREATE POLICY "Only authenticated players can insert wellness responses" 
ON wellness_responses 
FOR INSERT 
WITH CHECK (
  player_id IN (
    SELECT players.id
    FROM players
    WHERE players.user_id = auth.uid() 
    AND players.user_id IS NOT NULL
  )
);