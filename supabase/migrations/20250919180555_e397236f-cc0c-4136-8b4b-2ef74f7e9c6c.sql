-- Asignar organización OHiggins a todos los partidos de sub-20 temporada 2022 que no la tienen
UPDATE matches 
SET organization_id = 'c63c6669-d96e-4997-afc8-23a3bcda0c96'
WHERE season_id = 'd3b5fd4c-a520-4735-8042-77dc99ac9dc9' 
  AND organization_id IS NULL;

-- Asignar organización OHiggins a las categorías de la temporada 2022 que no la tienen
UPDATE categories 
SET organization_id = 'c63c6669-d96e-4997-afc8-23a3bcda0c96'
WHERE season_id = 'd3b5fd4c-a520-4735-8042-77dc99ac9dc9' 
  AND organization_id IS NULL;

-- Asignar organización OHiggins a la temporada 2022 si no la tiene
UPDATE seasons 
SET organization_id = 'c63c6669-d96e-4997-afc8-23a3bcda0c96'
WHERE id = 'd3b5fd4c-a520-4735-8042-77dc99ac9dc9' 
  AND organization_id IS NULL;

-- Actualizar política de evaluaciones para incluir jugadores eliminados de la misma organización
DROP POLICY IF EXISTS "Users can manage evaluations within their organization" ON evaluations;

CREATE POLICY "Users can manage evaluations within their organization" 
ON evaluations 
FOR ALL 
USING (
  player_id IN (
    SELECT p.id 
    FROM players p 
    JOIN users u ON (u.organization_id = p.organization_id) 
    WHERE u.id = auth.uid()
    -- Incluir jugadores eliminados también
  )
);