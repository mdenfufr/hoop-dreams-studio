import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Youtube, Trash2, Edit2 } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

interface ComplementaryMaterial {
  id: string;
  title: string;
  description?: string;
  material_type: 'video_upload' | 'youtube_link';
  file_url?: string;
  youtube_url?: string;
  created_at: string;
}

interface ComplementaryMaterialsListProps {
  materials: ComplementaryMaterial[];
  onRefresh: () => void;
  categoryId: string;
  seasonId: string;
}

export function ComplementaryMaterialsList({ 
  materials, 
  onRefresh, 
  categoryId, 
  seasonId 
}: ComplementaryMaterialsListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [materialType, setMaterialType] = useState<'video_upload' | 'youtube_link'>('video_upload');
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const { getGradientClasses } = useOrganizationTheme();
  const canModify = canEdit("football");

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Solo se permiten archivos de video",
      });
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El archivo no puede superar los 100MB",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('complementary-videos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('complementary-videos')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('complementary_materials')
        .insert({
          category_id: categoryId,
          season_id: seasonId,
          title,
          description,
          material_type: 'video_upload',
          file_url: urlData.publicUrl,
          uploaded_by: user.id
        });

      if (insertError) throw insertError;

      toast({
        title: "Éxito",
        description: "Video subido correctamente",
      });

      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Error uploading video:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo subir el video",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleYoutubeSubmit = async () => {
    if (!title.trim() || !youtubeUrl.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Título y URL de YouTube son requeridos",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase
        .from('complementary_materials')
        .insert({
          category_id: categoryId,
          season_id: seasonId,
          title,
          description,
          material_type: 'youtube_link',
          youtube_url: youtubeUrl,
          uploaded_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Link de YouTube añadido correctamente",
      });

      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Error adding YouTube link:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo añadir el link de YouTube",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('complementary_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Material eliminado correctamente",
      });

      onRefresh();
    } catch (error) {
      console.error('Error deleting material:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el material",
      });
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setYoutubeUrl("");
    setShowAddForm(false);
    setEditingId(null);
    setVideoDialogOpen(false);
    setYoutubeDialogOpen(false);
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  return (
    <div className="space-y-4">
      {canModify && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl px-4 py-2 transition-all duration-300 shadow-lg transform hover:scale-105`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl"></div>
                  <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                  <div className="relative flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4 text-primary-foreground" />
                    <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                      Subir Video
                    </span>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Subir Video</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Título"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Descripción (opcional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <div>
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={handleFileUpload}
                      disabled={uploading || !title.trim()}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Máximo 100MB. Formatos soportados: MP4, MOV, AVI, etc.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={youtubeDialogOpen} onOpenChange={setYoutubeDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl px-4 py-2 transition-all duration-300 shadow-lg transform hover:scale-105`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl"></div>
                  <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                  <div className="relative flex items-center justify-center gap-2">
                    <Youtube className="w-4 h-4 text-primary-foreground" />
                    <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                      Link YouTube
                    </span>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Añadir Link de YouTube</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Título"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Descripción (opcional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <Input
                    placeholder="URL de YouTube"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                  />
                  <Button
                    onClick={handleYoutubeSubmit}
                    disabled={!title.trim() || !youtubeUrl.trim()}
                    className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border hover:shadow-lg`}
                  >
                    Añadir Link
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materials.map((material) => (
          <Card key={material.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm">{material.title}</CardTitle>
                {canModify && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(material.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {material.description && (
                <p className="text-xs text-gray-600">{material.description}</p>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {material.material_type === 'video_upload' && material.file_url ? (
                <video
                  controls
                  className="w-full h-32 object-cover rounded"
                  src={material.file_url}
                />
              ) : material.material_type === 'youtube_link' && material.youtube_url ? (
                <iframe
                  className="w-full h-32 rounded"
                  src={getYouTubeEmbedUrl(material.youtube_url)}
                  frameBorder="0"
                  allowFullScreen
                />
              ) : null}
              <p className="text-xs text-gray-500 mt-2">
                {new Date(material.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}