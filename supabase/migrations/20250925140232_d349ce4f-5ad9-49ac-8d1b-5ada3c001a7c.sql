-- Obtener los IDs de la temporada 2022 y categoría Sub-20 de O'Higgins FC
DO $$
DECLARE
  v_org_id uuid;
  v_season_id uuid;
  v_category_id uuid;
BEGIN
  -- Obtener ID de O'Higgins FC
  SELECT id INTO v_org_id FROM organizations WHERE name = 'O''Higgins FC' LIMIT 1;
  
  -- Obtener ID de temporada 2022
  SELECT id INTO v_season_id FROM seasons WHERE name = '2022' AND organization_id = v_org_id LIMIT 1;
  
  -- Obtener ID de categoría Sub-20
  SELECT id INTO v_category_id FROM categories WHERE name = 'Sub-20' AND season_id = v_season_id LIMIT 1;
  
  -- Actualizar datasets de GPS con nombres específicos
  UPDATE gps_datasets 
  SET season_id = v_season_id, category_id = v_category_id
  WHERE organization_id = v_org_id 
    AND (name = '1' OR name = 'sesion 1' OR name = 'sesion 4')
    AND season_id IS NULL
    AND category_id IS NULL;
    
  -- Aplicar lo mismo a otros tipos de datasets si existen
  UPDATE speed_datasets 
  SET season_id = v_season_id, category_id = v_category_id
  WHERE organization_id = v_org_id 
    AND season_id IS NULL
    AND category_id IS NULL;
    
  UPDATE resistance_datasets 
  SET season_id = v_season_id, category_id = v_category_id
  WHERE organization_id = v_org_id 
    AND season_id IS NULL
    AND category_id IS NULL;
    
  UPDATE anthropometry_datasets 
  SET season_id = v_season_id, category_id = v_category_id
  WHERE organization_id = v_org_id 
    AND season_id IS NULL
    AND category_id IS NULL;
    
  UPDATE force_datasets 
  SET season_id = v_season_id, category_id = v_category_id
  WHERE organization_id = v_org_id 
    AND season_id IS NULL
    AND category_id IS NULL;
END $$;