-- Add senior_football_access column to users table
ALTER TABLE public.users 
ADD COLUMN senior_football_access text DEFAULT 'sin_acceso';