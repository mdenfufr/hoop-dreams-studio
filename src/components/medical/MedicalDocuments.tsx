import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Upload, Download, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { usePermissions } from "@/hooks/use-permissions";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

interface MedicalDocumentsProps {
  playerId: string;
}

export function MedicalDocuments({ playerId }: MedicalDocumentsProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { canEdit } = usePermissions();
  const { getGradientClasses } = useOrganizationTheme();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["medical-documents", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_documents")
        .select("*")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los documentos médicos",
        });
        throw error;
      }

      return data;
    },
    enabled: !!playerId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${playerId}/${Date.now()}.${fileExt}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("medical-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("medical-documents")
        .getPublicUrl(fileName);

      // Insert record into database
      const { data: docData, error: docError } = await supabase
        .from("medical_documents")
        .insert({
          player_id: playerId,
          document_name: file.name,
          document_url: urlData.publicUrl,
          document_type: file.type,
          file_size: file.size,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (docError) throw docError;

      return docData;
    },
    onSuccess: () => {
      toast({
        title: "Documento subido",
        description: "El documento médico se ha subido correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["medical-documents", playerId] });
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo subir el documento: " + error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (document: any) => {
      // Extract file path from URL
      const url = new URL(document.document_url);
      const filePath = url.pathname.split('/').slice(-2).join('/');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("medical-documents")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("medical_documents")
        .delete()
        .eq("id", document.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast({
        title: "Documento eliminado",
        description: "El documento médico se ha eliminado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["medical-documents", playerId] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el documento: " + error.message,
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "El archivo es demasiado grande. Máximo 10MB permitido.",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    try {
      await uploadMutation.mutateAsync(selectedFile);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      // Extract the file path from the URL
      const urlParts = doc.document_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${playerId}/${fileName}`;

      // Download file from Supabase Storage
      const { data, error } = await supabase.storage
        .from("medical-documents")
        .download(filePath);

      if (error) {
        throw error;
      }

      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = window.document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = doc.document_name;
      window.document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo descargar el documento: " + (error as any).message,
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return <div>Cargando documentos...</div>;
  }

  return (
    <div className="space-y-6">
      {canEdit("medical_staff") && (
        <Card>
          <CardHeader>
            <CardTitle>Subir Nuevo Documento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Seleccionar archivo</Label>
              <Input
                id="file-upload"
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
              />
              {selectedFile && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Archivo seleccionado: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </div>
              )}
            </div>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || uploading}
              className={`w-full relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border hover:shadow-lg`}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Subiendo..." : "Subir Documento"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documentos Médicos</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay documentos médicos registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Documento</TableHead>
                  <TableHead>Fecha de Subida</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>{document.document_name}</TableCell>
                    <TableCell>
                      {format(new Date(document.created_at), "PPP 'a las' p", { locale: es })}
                    </TableCell>
                    <TableCell>
                      {document.file_size ? formatFileSize(document.file_size) : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(document)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>

                        {canEdit("medical_staff") && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El documento será eliminado permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(document)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}