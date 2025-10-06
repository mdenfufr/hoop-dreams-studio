-- Add is_active column to ailments table to track active/inactive ailments
ALTER TABLE public.ailments 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;