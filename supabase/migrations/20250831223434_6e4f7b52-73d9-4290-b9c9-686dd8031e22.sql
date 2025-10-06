-- Create a table for coach-category assignments with specific roles
CREATE TABLE public.coach_category_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid NOT NULL,
  category_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'visualizador', -- 'editor' or 'visualizador'
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(coach_id, category_id)
);

-- Enable RLS on the new table
ALTER TABLE public.coach_category_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for coach_category_assignments
CREATE POLICY "Allow authenticated users full access to coach assignments" 
ON public.coach_category_assignments 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_coach_category_assignments_updated_at
BEFORE UPDATE ON public.coach_category_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraints
ALTER TABLE public.coach_category_assignments 
ADD CONSTRAINT fk_coach_id FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON DELETE CASCADE;

ALTER TABLE public.coach_category_assignments 
ADD CONSTRAINT fk_category_id FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

-- Add email and user_id columns to coaches table to link with users
ALTER TABLE public.coaches 
ADD COLUMN email text,
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;