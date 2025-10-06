-- Add INSERT policy for medical staff to create ailments for any player
CREATE POLICY "Medical staff can insert ailments for any player"
ON public.ailments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND COALESCE(u.medical_staff_access, 'sin_acceso') = ANY (ARRAY['visualizador', 'editor', 'administrador'])
  )
);