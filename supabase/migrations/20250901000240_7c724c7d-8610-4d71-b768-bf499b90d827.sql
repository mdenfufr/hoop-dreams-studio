-- Crear asignaciones para entrenadores que no las tienen aún
INSERT INTO coach_category_assignments (coach_id, category_id, role)
SELECT 
  c.id as coach_id,
  c.category_id,
  CASE 
    WHEN c.user_id IS NOT NULL THEN 'editor'
    ELSE 'visualizador'
  END as role
FROM coaches c
WHERE c.category_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM coach_category_assignments cca 
    WHERE cca.coach_id = c.id AND cca.category_id = c.category_id
  );