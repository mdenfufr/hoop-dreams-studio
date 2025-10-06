-- Actualizar jugadores sin organización para asignarles la organización de OHiggins
UPDATE players 
SET organization_id = 'c63c6669-d96e-4997-afc8-23a3bcda0c96'
WHERE organization_id IS NULL;

-- Actualizar jugadores eliminados para asignarles la organización de OHiggins
UPDATE players 
SET organization_id = 'c63c6669-d96e-4997-afc8-23a3bcda0c96'
WHERE is_deleted = true AND organization_id IS NULL;