-- Crear tabla para documentos psicológicos
CREATE TABLE public.psychological_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  document_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.psychological_documents ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Medical staff can view all documents" 
  ON public.psychological_documents
  FOR SELECT
  USING (true);

CREATE POLICY "Medical staff can insert documents" 
  ON public.psychological_documents
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Medical staff can delete documents" 
  ON public.psychological_documents
  FOR DELETE
  USING (true);

CREATE POLICY "Medical staff can update documents" 
  ON public.psychological_documents
  FOR UPDATE
  USING (true);

CREATE POLICY "Players can view their own documents" 
  ON public.psychological_documents
  FOR SELECT
  USING (player_id IN (
    SELECT id FROM public.players 
    WHERE user_id = auth.uid()
  ));

-- Crear bucket de almacenamiento
INSERT INTO storage.buckets (id, name, public)
VALUES ('psychological-documents', 'psychological-documents', true);

-- Políticas de acceso al bucket
CREATE POLICY "Allow uploads for medical staff"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'psychological-documents'
  );

CREATE POLICY "Allow public read access"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'psychological-documents'
  );

CREATE POLICY "Allow medical staff to delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'psychological-documents'
  );