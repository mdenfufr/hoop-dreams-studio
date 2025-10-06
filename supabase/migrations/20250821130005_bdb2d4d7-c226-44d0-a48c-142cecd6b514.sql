-- Actualizar políticas RLS para wellness_responses para permitir que el personal médico vea todas las respuestas
DROP POLICY IF EXISTS "Players can view and insert their own wellness responses" ON public.wellness_responses;

-- Política para que jugadores puedan insertar sus propias respuestas
CREATE POLICY "Players can insert their own wellness responses" 
ON public.wellness_responses 
FOR INSERT 
WITH CHECK (player_id IN ( 
  SELECT players.id 
  FROM players 
  WHERE players.user_id = auth.uid()
));

-- Política para que jugadores puedan ver sus propias respuestas
CREATE POLICY "Players can view their own wellness responses" 
ON public.wellness_responses 
FOR SELECT 
USING (player_id IN ( 
  SELECT players.id 
  FROM players 
  WHERE players.user_id = auth.uid()
));

-- Política para que el personal médico pueda ver todas las respuestas
CREATE POLICY "Medical staff can view all wellness responses" 
ON public.wellness_responses 
FOR SELECT 
USING (true);

-- Actualizar políticas similares para rpe_responses
DROP POLICY IF EXISTS "Players can view and insert their own RPE responses" ON public.rpe_responses;

CREATE POLICY "Players can insert their own RPE responses" 
ON public.rpe_responses 
FOR INSERT 
WITH CHECK (player_id IN ( 
  SELECT players.id 
  FROM players 
  WHERE players.user_id = auth.uid()
));

CREATE POLICY "Players can view their own RPE responses" 
ON public.rpe_responses 
FOR SELECT 
USING (player_id IN ( 
  SELECT players.id 
  FROM players 
  WHERE players.user_id = auth.uid()
));

CREATE POLICY "Medical staff can view all RPE responses" 
ON public.rpe_responses 
FOR SELECT 
USING (true);

-- Actualizar políticas similares para body_pain_responses  
DROP POLICY IF EXISTS "Players can view and insert their own pain responses" ON public.body_pain_responses;

CREATE POLICY "Players can insert their own pain responses" 
ON public.body_pain_responses 
FOR INSERT 
WITH CHECK (player_id IN ( 
  SELECT players.id 
  FROM players 
  WHERE players.user_id = auth.uid()
));

CREATE POLICY "Players can view their own pain responses" 
ON public.body_pain_responses 
FOR SELECT 
USING (player_id IN ( 
  SELECT players.id 
  FROM players 
  WHERE players.user_id = auth.uid()
));

CREATE POLICY "Medical staff can view all pain responses" 
ON public.body_pain_responses 
FOR SELECT 
USING (true);

-- Actualizar políticas para ailments
DROP POLICY IF EXISTS "Players can view and insert their own ailments" ON public.ailments;

CREATE POLICY "Players can insert their own ailments" 
ON public.ailments 
FOR INSERT 
WITH CHECK (player_id IN ( 
  SELECT players.id 
  FROM players 
  WHERE players.user_id = auth.uid()
));

CREATE POLICY "Players can view their own ailments" 
ON public.ailments 
FOR SELECT 
USING (player_id IN ( 
  SELECT players.id 
  FROM players 
  WHERE players.user_id = auth.uid()
));

CREATE POLICY "Medical staff can view all ailments" 
ON public.ailments 
FOR SELECT 
USING (true);