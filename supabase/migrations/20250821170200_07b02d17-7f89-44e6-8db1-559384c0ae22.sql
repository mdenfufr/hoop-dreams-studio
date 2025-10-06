-- Create table for medical documents
CREATE TABLE public.medical_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES public.players(id),
  staff_id UUID REFERENCES public.staff(id),
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  document_type TEXT,
  file_size INTEGER,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for medical documents
CREATE POLICY "Medical staff can view all documents" 
ON public.medical_documents 
FOR SELECT 
USING (true);

CREATE POLICY "Medical staff can insert documents" 
ON public.medical_documents 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Medical staff can update documents" 
ON public.medical_documents 
FOR UPDATE 
USING (true);

CREATE POLICY "Medical staff can delete documents" 
ON public.medical_documents 
FOR DELETE 
USING (true);

CREATE POLICY "Players can view their own documents" 
ON public.medical_documents 
FOR SELECT 
USING (player_id IN (
  SELECT players.id
  FROM players
  WHERE players.user_id = auth.uid()
));

-- Create storage bucket for medical documents
INSERT INTO storage.buckets (id, name, public) VALUES ('medical-documents', 'medical-documents', false);

-- Create storage policies for medical documents
CREATE POLICY "Medical staff can view medical documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'medical-documents');

CREATE POLICY "Medical staff can upload medical documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'medical-documents');

CREATE POLICY "Medical staff can update medical documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'medical-documents');

CREATE POLICY "Medical staff can delete medical documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'medical-documents');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_medical_documents_updated_at
BEFORE UPDATE ON public.medical_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();