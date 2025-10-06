import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Image, Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Coach } from "@/types/coach";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

interface AddCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (coach: Coach) => void;
  categoryId: string;
  initialData?: Coach;
}

export function AddCoachModal({ isOpen, onClose, onAdd, categoryId, initialData }: AddCoachModalProps) {
  const [coach, setCoach] = useState<Omit<Coach, 'category_id' | 'id'>>({
    name: "",
    age: "",
    email: "",
    password: "",
    image_url: "",
  });
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { getGradientClasses } = useOrganizationTheme();

  useEffect(() => {
    if (!isOpen) {
      setCoach({
        name: "",
        age: "",
        email: "",
        password: "",
        image_url: "",
      });
    } else if (initialData) {
      setCoach({
        name: initialData.name,
        age: initialData.age || "",
        email: initialData.email || "",
        password: "",
        image_url: initialData.image_url || "",
      });
    }
  }, [isOpen, initialData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `coach-images/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('public')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      setCoach({ ...coach, image_url: publicUrl });
      toast({
        title: "Éxito",
        description: "Imagen subida correctamente",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al subir la imagen. Intentándolo de otra forma...",
      });
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('https://pdrpxdgzosnuysuzzprr.supabase.co/storage/v1/object/public/public/coach-images/' + file.name, {
          method: 'POST',
          body: file,
          headers: {
            'Authorization': `Bearer ${supabase.auth.getSession().then(res => res.data.session?.access_token || '')}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkcnB4ZGd6b3NudXlzdXp6cHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNzkxNDMsImV4cCI6MjA1MTg1NTE0M30.S2F-45Zo4MWXdg0xoSisNX98TpCCKON2lVeKXMUooI0'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload with direct method');
        }
        
        const imageUrl = `https://pdrpxdgzosnuysuzzprr.supabase.co/storage/v1/object/public/public/coach-images/${file.name}`;
        setCoach({ ...coach, image_url: imageUrl });
        
        toast({
          title: "Éxito",
          description: "Imagen subida correctamente (usando método alternativo)",
        });
      } catch (secondError) {
        console.error('Secondary upload error:', secondError);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error al subir la imagen. Por favor, inténtelo de nuevo.",
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coach.name) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor complete el nombre del entrenador",
      });
      return;
    }
    
    try {
      const coachData: Coach = {
        ...coach,
        category_id: categoryId,
        senior_category_id: categoryId,
        id: initialData?.id || ''
      };
      
      onAdd(coachData);
      onClose();
    } catch (error) {
      console.error("Error submitting coach:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo añadir el entrenador. Inténtelo de nuevo.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Entrenador" : "Añadir Entrenador"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="coachImage" className="text-sm font-medium">
              Imagen
            </label>
            <div className="flex items-center gap-4">
              {coach.image_url ? (
                <img 
                  src={coach.image_url} 
                  alt="Coach" 
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <Image className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <Input
                  id="coachImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  type="button"
                  className={`w-full bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} text-primary-foreground border border-border hover:shadow-lg`}
                  onClick={() => document.getElementById('coachImage')?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Subiendo..." : "Subir imagen"}
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="coachName" className="text-sm font-medium">
              Nombre
            </label>
            <Input
              id="coachName"
              placeholder="Nombre del entrenador"
              value={coach.name}
              onChange={(e) => setCoach({ ...coach, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="age" className="text-sm font-medium">
              Edad
            </label>
            <Input
              id="age"
              placeholder="Edad"
              value={coach.age}
              onChange={(e) => setCoach({ ...coach, age: e.target.value })}
              type="number"
              min="1"
              max="99"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Correo
            </label>
            <Input
              id="email"
              placeholder="Correo electrónico"
              value={coach.email}
              onChange={(e) => setCoach({ ...coach, email: e.target.value })}
              type="email"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <Input
              id="password"
              placeholder="Contraseña"
              value={coach.password}
              onChange={(e) => setCoach({ ...coach, password: e.target.value })}
              type="password"
            />
          </div>
          <Button type="submit" className={`w-full bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} text-primary-foreground border border-border hover:shadow-lg`}>
            {initialData ? "Actualizar Entrenador" : "Añadir Entrenador"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
