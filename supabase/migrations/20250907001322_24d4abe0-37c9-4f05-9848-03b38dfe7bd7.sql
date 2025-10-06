-- Create complementary materials table
CREATE TABLE public.complementary_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL,
  season_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  material_type TEXT NOT NULL CHECK (material_type IN ('video_upload', 'youtube_link')),
  file_url TEXT, -- For uploaded videos
  youtube_url TEXT, -- For YouTube links
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security
ALTER TABLE public.complementary_materials ENABLE ROW LEVEL SECURITY;

-- Create policies for complementary materials
CREATE POLICY "Users can view complementary materials" 
ON public.complementary_materials 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create complementary materials" 
ON public.complementary_materials 
FOR INSERT 
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own complementary materials" 
ON public.complementary_materials 
FOR UPDATE 
USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own complementary materials" 
ON public.complementary_materials 
FOR DELETE 
USING (auth.uid() = uploaded_by);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_complementary_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_complementary_materials_updated_at
BEFORE UPDATE ON public.complementary_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_complementary_materials_updated_at();

-- Create storage bucket for complementary material videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('complementary-videos', 'complementary-videos', true);

-- Create storage policies for video uploads
CREATE POLICY "Users can view complementary videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'complementary-videos');

CREATE POLICY "Users can upload complementary videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'complementary-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own complementary videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'complementary-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own complementary videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'complementary-videos' AND auth.uid()::text = (storage.foldername(name))[1]);