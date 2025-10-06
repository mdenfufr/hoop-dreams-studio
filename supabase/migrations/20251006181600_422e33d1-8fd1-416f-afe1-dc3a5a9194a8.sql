-- Crear tabla para configuración de sesiones de entrenamiento diarias
CREATE TABLE IF NOT EXISTS public.daily_training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_date DATE NOT NULL,
  session_count INTEGER NOT NULL CHECK (session_count >= 0),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  senior_category_id UUID REFERENCES public.senior_categories(id) ON DELETE CASCADE,
  season_id UUID,
  senior_season_id UUID,
  organization_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT daily_training_sessions_category_check CHECK (
    (category_id IS NOT NULL AND senior_category_id IS NULL) OR
    (category_id IS NULL AND senior_category_id IS NOT NULL)
  ),
  CONSTRAINT daily_training_sessions_unique_date_category UNIQUE (config_date, category_id, senior_category_id)
);

-- Habilitar RLS
ALTER TABLE public.daily_training_sessions ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios puedan ver configuraciones de su organización
CREATE POLICY "Users can view daily training sessions within their organization"
ON public.daily_training_sessions
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  )
);

-- Política para que usuarios con acceso de editor puedan insertar
CREATE POLICY "Medical staff can insert daily training sessions"
ON public.daily_training_sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND medical_staff_access IN ('editor', 'administrador')
  )
  AND organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  )
);

-- Política para que usuarios con acceso de editor puedan actualizar
CREATE POLICY "Medical staff can update daily training sessions"
ON public.daily_training_sessions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND medical_staff_access IN ('editor', 'administrador')
  )
  AND organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  )
);

-- Agregar campo session_number a wellness_responses
ALTER TABLE public.wellness_responses 
ADD COLUMN IF NOT EXISTS session_number INTEGER DEFAULT 1;

-- Agregar campo session_number a rpe_responses
ALTER TABLE public.rpe_responses 
ADD COLUMN IF NOT EXISTS session_number INTEGER DEFAULT 1;

-- Agregar campo session_number a body_pain_responses
ALTER TABLE public.body_pain_responses 
ADD COLUMN IF NOT EXISTS session_number INTEGER DEFAULT 1;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_daily_training_sessions_date_category 
ON public.daily_training_sessions(config_date, category_id, senior_category_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_daily_training_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_training_sessions_updated_at
BEFORE UPDATE ON public.daily_training_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_daily_training_sessions_updated_at();