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

interface PsychologicalDocumentsProps {
  playerId: string;
}

export function PsychologicalDocuments({ playerId }: PsychologicalDocumentsProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { canEdit } = usePermissions();
  const { getGradientClasses } = useOrganizationTheme();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["psychological-documents", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("psychological_documents")
        .select("*")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando informes psicológicos:", error);
        return [] as any[];
      }

      return data;
    },
    enabled: !!playerId,
    retry: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${playerId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("psychological-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("psychological-documents")
        .getPublicUrl(fileName);

      const { data: docData, error: docError } = await supabase
        .from("psychological_documents")
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
        title: "Informe subido",
        description: "El informe psicológico se ha subido correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["psychological-documents", playerId] });
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo subir el informe: " + error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (document: any) => {
      const url = new URL(document.document_url);
      const filePath = url.pathname.split('/').slice(-2).join('/');

      const { error: storageError } = await supabase.storage
        .from("psychological-documents")
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("psychological_documents")
        .delete()
        .eq("id", document.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast({
        title: "Informe eliminado",
        description: "El informe psicológico se ha eliminado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["psychological-documents", playerId] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el informe: " + error.message,
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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
      const urlParts = doc.document_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${playerId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from("psychological-documents")
        .download(filePath);

      if (error) throw error;

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
        description: "No se pudo descargar el informe: " + (error as any).message,
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
    return <div>Cargando informes...</div>;
  }

  return (
    <div className="space-y-6">
      {canEdit("medical_staff") && (
        <Card>
          <CardHeader>
            <CardTitle>Subir Nueva Evaluación Psicológica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="file-upload-psych">Seleccionar archivo</Label>
              <Input
                id="file-upload-psych"
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
              {uploading ? "Subiendo..." : "Subir Evaluación"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Evaluaciones Psicológicas</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay evaluaciones psicológicas registradas</p>
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
                {documents.map((document: any) => (
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
                          <Download className="w-4 h-4 mr-2" />
                          Descargar
                        </Button>
                        {canEdit("medical_staff") && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Esto eliminará permanentemente el informe.
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