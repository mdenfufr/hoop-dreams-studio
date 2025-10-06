-- 1. Agregar columna organization_id a las tablas de datasets de parte física
ALTER TABLE public.anthropometry_datasets 
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.force_datasets 
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.resistance_datasets 
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.speed_datasets 
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.gps_datasets 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- 2. Asignar todos los datasets existentes sin organización a O'Higgins
UPDATE public.anthropometry_datasets 
SET organization_id = 'c63c6669-d96e-4997-afc8-23a3bcda0c96'::uuid
WHERE organization_id IS NULL;

UPDATE public.force_datasets 
SET organization_id = 'c63c6669-d96e-4997-afc8-23a3bcda0c96'::uuid
WHERE organization_id IS NULL;

UPDATE public.resistance_datasets 
SET organization_id = 'c63c6669-d96e-4997-afc8-23a3bcda0c96'::uuid
WHERE organization_id IS NULL;

UPDATE public.speed_datasets 
SET organization_id = 'c63c6669-d96e-4997-afc8-23a3bcda0c96'::uuid
WHERE organization_id IS NULL;

UPDATE public.gps_datasets 
SET organization_id = 'c63c6669-d96e-4997-afc8-23a3bcda0c96'::uuid
WHERE organization_id IS NULL;

-- 3. Actualizar las políticas RLS para que solo vean los datasets de su organización
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.anthropometry_datasets;
CREATE POLICY "Users can manage datasets within their organization" 
ON public.anthropometry_datasets 
FOR ALL 
USING (organization_id IN (
  SELECT organization_id FROM public.users WHERE id = auth.uid()
));

DROP POLICY IF EXISTS "Enable all operations for all users" ON public.force_datasets;
CREATE POLICY "Users can manage datasets within their organization" 
ON public.force_datasets 
FOR ALL 
USING (organization_id IN (
  SELECT organization_id FROM public.users WHERE id = auth.uid()
));

DROP POLICY IF EXISTS "Enable all operations for all users" ON public.resistance_datasets;
CREATE POLICY "Users can manage datasets within their organization" 
ON public.resistance_datasets 
FOR ALL 
USING (organization_id IN (
  SELECT organization_id FROM public.users WHERE id = auth.uid()
));

DROP POLICY IF EXISTS "Enable all operations for all users" ON public.speed_datasets;
CREATE POLICY "Users can manage datasets within their organization" 
ON public.speed_datasets 
FOR ALL 
USING (organization_id IN (
  SELECT organization_id FROM public.users WHERE id = auth.uid()
));

DROP POLICY IF EXISTS "Enable all operations for all users" ON public.gps_datasets;
CREATE POLICY "Users can manage datasets within their organization" 
ON public.gps_datasets 
FOR ALL 
USING (organization_id IN (
  SELECT organization_id FROM public.users WHERE id = auth.uid()
));