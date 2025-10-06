
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Image, Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

const positions = [
  { value: "portero", label: "Portero" },
  { value: "defensa_central", label: "Defensa Central" },
  { value: "lateral_izquierdo", label: "Lateral Izquierdo" },
  { value: "lateral_derecho", label: "Lateral Derecho" },
  { value: "mediocampista_ofensivo", label: "Mediocampista Ofensivo" },
  { value: "mediocampista_defensivo", label: "Mediocampista Defensivo" },
  { value: "mediocampista_mixto", label: "Mediocampista Mixto" },
  { value: "delantero_centro", label: "Delantero Centro" },
  { value: "extremo_izquierdo", label: "Extremo Izquierdo" },
  { value: "extremo_derecho", label: "Extremo Derecho" },
];

interface Player {
  name: string;
  age: string;
  height: string;
  weight: string;
  position: string;
  image_url?: string;
  jersey_number?: string;
  rut?: string;
  password?: string;
  category_id: string;
}

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (player: Player) => void;
  categoryId?: string;
  seniorCategoryId?: string;
  initialData?: {
    name: string;
    age?: number;
    height?: string;
    weight?: string;
    position?: string;
    image_url?: string;
    jersey_number?: string;
    rut?: string;
    password?: string;
    id?: string;
  };
}

export function AddPlayerModal({ isOpen, onClose, onAdd, categoryId, seniorCategoryId, initialData }: AddPlayerModalProps) {
  const [player, setPlayer] = useState<Player>({
    name: "",
    age: "",
    height: "",
    weight: "",
    position: "",
    image_url: "",
    jersey_number: "",
    rut: "",
    password: "",
    category_id: categoryId || seniorCategoryId || ""
  });
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null); // Imagen temporal hasta guardar
  const { toast } = useToast();
  const { getGradientClasses } = useOrganizationTheme();

  useEffect(() => {
    if (initialData) {
      setIsEditing(true);
      // NO limpiar tempImageUrl aquí - debe persistir mientras el modal está abierto
      
      setPlayer({
        name: initialData.name || "",
        age: initialData.age?.toString() || "",
        height: initialData.height || "",
        weight: initialData.weight || "",
        position: initialData.position || "",
        image_url: initialData.image_url || "",
        jersey_number: initialData.jersey_number || "",
        rut: initialData.rut || "",
        password: initialData.password || "",
        category_id: categoryId || seniorCategoryId || ""
      });
    } else {
      setIsEditing(false);
      setTempImageUrl(null); // Solo limpiar para nuevos jugadores
      setPlayer({
        name: "",
        age: "",
        height: "",
        weight: "",
        position: "",
        image_url: "",
        jersey_number: "",
        rut: "",
        password: "",
        category_id: categoryId || seniorCategoryId || ""
      });
    }
  }, [initialData, categoryId, seniorCategoryId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);

      // Siempre solo subir al storage, sin actualizar la DB
      // La DB se actualiza al presionar "Guardar cambios"
      const { data, error } = await supabase.functions.invoke('upload-image', {
        body: formData,
      });

      if (error) {
        throw error;
      }

      console.log("Image uploaded to storage:", data.url);
      
      // Guardar URL temporal
      setTempImageUrl(data.url);
      
      toast({
        title: "Imagen cargada",
        description: isEditing ? "Presione 'Guardar Cambios' para aplicar la nueva imagen" : "Presione 'Añadir Jugador' para completar el registro",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al subir la imagen",
      });
    } finally {
      setUploading(false);
    }
  };

  const createOrUpdateUser = async (playerData: Player, isEditing: boolean, playerId?: string) => {
    if (!playerData.rut || !playerData.password) {
      // Si no se proporcionan credenciales, sólo guardar los datos del jugador
      return { success: true };
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No hay sesión activa. Por favor inicie sesión nuevamente.");
      }
      
      const supabaseUrl = new URL(import.meta.env.VITE_SUPABASE_URL || "https://pdrpxdgzosnuysuzzprr.supabase.co");
      
      if (isEditing && playerId) {
        // Actualizar usuario existente
        const functionUrl = `${supabaseUrl.origin}/functions/v1/update-user`;
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            userId: playerId,
            userData: {
              football_access: "sin_acceso",
              medical_players_access: "editor",
              medical_staff_access: "sin_acceso",
              physical_access: "sin_acceso",
              youth_records_access: "sin_acceso",
              staff_access: "sin_acceso",
              ...(playerData.password ? { password: playerData.password } : {})
            }
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error al actualizar usuario: ${errorText}`);
        }
        
        const result = await response.json();
        return result;
      } else {
        // Crear nuevo usuario
        const finalImageUrl = tempImageUrl || playerData.image_url;
        
        const { data, error } = await supabase.auth.signUp({
          email: playerData.rut,
          password: playerData.password,
          options: {
            data: {
              football_access: "sin_acceso",
              medical_players_access: "editor",
              medical_staff_access: "sin_acceso",
              physical_access: "sin_acceso",
              youth_records_access: "sin_acceso",
              staff_access: "sin_acceso",
              // Incluir datos del jugador para el trigger
              category_id: categoryId || null,
              senior_category_id: seniorCategoryId || null,
              organization_id: "c63c6669-d96e-4997-afc8-23a3bcda0c96", // OHiggins
              name: playerData.name,
              position: playerData.position,
              age: playerData.age,
              height: playerData.height,
              weight: playerData.weight,
              jersey_number: playerData.jersey_number,
              image_url: finalImageUrl
            }
          }
        });

        if (error) {
          // Handle specific email already exists error
          if (error.message?.includes('already') || error.message?.includes('email')) {
            throw new Error("Este correo ya está registrado. Por favor use un correo diferente.");
          }
          throw error;
        }

        return { success: true, userId: data.user?.id };
      }
    } catch (error: any) {
      console.error("Error al crear/actualizar usuario:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al crear/actualizar usuario",
      });
      return { success: false, error: error.message };
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No hay sesión activa. Por favor inicie sesión nuevamente.");
      }
      
      const supabaseUrl = new URL(import.meta.env.VITE_SUPABASE_URL || "https://pdrpxdgzosnuysuzzprr.supabase.co");
      const functionUrl = `${supabaseUrl.origin}/functions/v1/delete-user`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: userId
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al eliminar usuario: ${errorText}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error("Error al eliminar usuario:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al eliminar usuario",
      });
      return { success: false, error: error.message };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player.name || !player.position) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor complete los campos requeridos",
      });
      return;
    }

    try {
      console.log("Submitting player with category_id:", player.category_id);
      
        // Si es una edición
        if (isEditing && initialData?.id) {
          if (player.rut) {
            // Buscar si el jugador tiene un usuario asociado
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id')
              .eq('email', initialData.rut)
              .maybeSingle();

            if (userData && player.password) {
              // Solo actualizar el usuario si se proporciona una nueva contraseña
              const updateResult = await createOrUpdateUser(player, true, userData.id);
              if (!updateResult.success) {
                return; // Error ya mostrado en createOrUpdateUser
              }
            }
          }
        
        // Para edición, usar tempImageUrl si existe, sino mantener la actual
        const finalImageUrl = tempImageUrl || player.image_url;
        
        console.log("Updating player with image_url:", finalImageUrl);
        console.log("tempImageUrl:", tempImageUrl);
        console.log("player.image_url:", player.image_url);
        
        const { error: updateError } = await supabase.rpc('update_player_with_image', {
          p_player_id: initialData.id,
          p_name: player.name,
          p_email: player.rut || null,
          p_position: player.position || null,
          p_age: player.age ? parseInt(player.age) : null,
          p_height: player.height || null,
          p_weight: player.weight || null,
          p_jersey_number: player.jersey_number || null,
          p_image_url: finalImageUrl || null,
          p_category_id: categoryId || null,
          p_senior_category_id: seniorCategoryId || null
        });
          
        if (updateError) {
          console.error('Error updating player:', updateError);
          toast({
            variant: "destructive",
            title: "Error",
            description: updateError.message || "Error al actualizar el jugador",
          });
          return;
        }
        
        // Obtener el jugador actualizado para cache-busting
        const { data: updatedPlayer, error: fetchError } = await supabase
          .from('players')
          .select('image_url, updated_at')
          .eq('id', initialData.id)
          .single();
        
        console.log("Updated player from DB:", updatedPlayer);
        console.log("Fetch error:", fetchError);
        
        toast({
          title: "Éxito",
          description: "Jugador actualizado correctamente",
        });
        
        // Limpiar el formulario y cerrar el modal
        setPlayer({ 
          name: "", 
          age: "", 
          height: "", 
          weight: "", 
          position: "", 
          image_url: "", 
          jersey_number: "", 
          rut: "", 
          password: "",
          category_id: categoryId
        });
        setTempImageUrl(null);
        onClose();
        
        // Refrescar la lista de jugadores sin hacer otro update
        window.location.reload();
      } else if (!isEditing) {
        // Nuevo jugador
        // Si se ingresó un correo (RUT), SIEMPRE validamos duplicidad vía RPC, incluso sin contraseña
        if (player.rut) {
          const finalImageUrl = tempImageUrl || player.image_url;
          
          const { data: reuseResult, error: reuseError } = await supabase.rpc('handle_player_email_reuse', {
            p_email: player.rut,
            p_name: player.name,
            p_age: player.age ? parseInt(player.age) : null,
            p_height: player.height,
            p_weight: player.weight,
            p_position: player.position,
            p_image_url: finalImageUrl,
            p_jersey_number: player.jersey_number,
            p_category_id: categoryId || null,
            p_senior_category_id: seniorCategoryId || null,
            p_password: player.password || null,
          });

          const reuse = reuseResult as any;

          if (reuseError) {
            console.error('Error en handle_player_email_reuse:', reuseError);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo validar el correo del jugador.' });
            return;
          }

          // Si el correo ya está en uso por un jugador activo (en Youth o Senior) → BLOQUEAR
          if (reuse?.success === false && reuse?.error === 'email_in_use') {
            toast({ variant: 'destructive', title: 'Correo en uso', description: reuse?.message || 'Este correo ya está asociado a un jugador.' });
            return;
          }

          // Si el correo está libre para crear un usuario nuevo pero no se ingresó contraseña → pedirla y bloquear
          if (reuse?.create_new_user && !player.password) {
            toast({ variant: 'destructive', title: 'Falta contraseña', description: 'Ingrese una contraseña para crear la cuenta del jugador.' });
            return;
          }

          // Si hay que crear un usuario nuevo y sí hay contraseña → crear usuario (el trigger insertará el jugador)
          if (reuse?.create_new_user && player.password) {
            const userResult = await createOrUpdateUser(player, false);
            if (!userResult.success) return;
            // Añadir un pequeño delay para asegurar que el trigger se ejecute
            setTimeout(() => {
              onAdd({ refresh: true } as unknown as Player);
            }, 1000);
            toast({ title: 'Éxito', description: 'Jugador creado correctamente' });
            return;
          }

          // Si se reutiliza cuenta (usuario existe y no hay jugador activo con ese correo) → la RPC ya creó el jugador
          if (reuse?.reused_account) {
            if (!player.password) {
              toast({ variant: 'destructive', title: 'Contraseña requerida', description: 'Este correo ya tiene cuenta. Ingrese contraseña para vincular.' });
              return;
            }
            toast({ title: 'Éxito', description: 'Cuenta existente reutilizada y jugador creado.' });
            // Añadir un pequeño delay para asegurar que el registro se complete
            setTimeout(() => {
              onAdd({ refresh: true } as unknown as Player);
            }, 1000);
            return;
          }

          // Cualquier otro resultado inesperado → bloquear para evitar mensajes de éxito erróneos
          toast({ variant: 'destructive', title: 'Error', description: 'No fue posible crear el jugador con el correo ingresado.' });
          return;
        }

        // Sin correo (jugador sin autenticación) → crear registro sin email/usuario
        const finalImageUrl = tempImageUrl || player.image_url;
        
        const playerDataForDB = {
          name: player.name,
          age: player.age ? parseInt(player.age) : null,
          height: player.height,
          weight: player.weight,
          position: player.position,
          image_url: finalImageUrl,
          jersey_number: player.jersey_number,
          ...(categoryId ? { category_id: categoryId } : {}),
          ...(seniorCategoryId ? { senior_category_id: seniorCategoryId } : {}),
          email: null,
          user_id: null
        };

        onAdd(playerDataForDB as unknown as Player);
      }
      
      // Limpiar el formulario y cerrar el modal solo si llegamos aquí sin errores
      setPlayer({ 
        name: "", 
        age: "", 
        height: "", 
        weight: "", 
        position: "", 
        image_url: "", 
        jersey_number: "", 
        rut: "", 
        password: "",
        category_id: categoryId
      });
      setTempImageUrl(null); // Limpiar imagen temporal
      onClose();
    } catch (error: any) {
      console.error("Error en handleSubmit:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Ha ocurrido un error al procesar la solicitud",
      });
    }
  };

  const handleClose = () => {
    setTempImageUrl(null); // Limpiar imagen temporal al cerrar
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Jugador" : "Añadir Jugador"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica la información del jugador" : "Añade un nuevo jugador al equipo"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[calc(90vh-120px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="playerImage" className="text-sm font-medium">
                Imagen
              </label>
              <div className="flex items-center gap-4">
                {(tempImageUrl || player.image_url) ? (
                  <img 
                    src={tempImageUrl || player.image_url} 
                    alt="Player" 
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <Image className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    id="playerImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    className={`w-full bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} text-primary-foreground border border-border hover:shadow-lg`}
                    onClick={() => document.getElementById('playerImage')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Subiendo..." : "Subir imagen"}
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="playerName" className="text-sm font-medium">
                Nombre
              </label>
              <Input
                id="playerName"
                placeholder="Nombre del jugador"
                value={player.name}
                onChange={(e) => setPlayer({ ...player, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="playerRut" className="text-sm font-medium">
                Correo
              </label>
              <Input
                id="playerRut"
                placeholder="ejemplo@correo.com"
                value={player.rut}
                onChange={(e) => setPlayer({ ...player, rut: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="playerPassword" className="text-sm font-medium">
                Contraseña
              </label>
              <Input
                id="playerPassword"
                type="password"
                placeholder="Contraseña"
                value={player.password}
                onChange={(e) => setPlayer({ ...player, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="position" className="text-sm font-medium">
                Posición
              </label>
              <Select
                value={player.position}
                onValueChange={(value) => setPlayer({ ...player, position: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una posición" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem key={position.value} value={position.value}>
                      {position.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="jerseyNumber" className="text-sm font-medium">
                Número de camiseta
              </label>
              <Input
                id="jerseyNumber"
                placeholder="Número"
                value={player.jersey_number}
                onChange={(e) => setPlayer({ ...player, jersey_number: e.target.value })}
                type="number"
                min="1"
                max="99"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="age" className="text-sm font-medium">
                Edad
              </label>
              <Input
                id="age"
                placeholder="Edad"
                value={player.age}
                onChange={(e) => setPlayer({ ...player, age: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="height" className="text-sm font-medium">
                Estatura (cm)
              </label>
              <Input
                id="height"
                placeholder="Estatura"
                value={player.height}
                onChange={(e) => setPlayer({ ...player, height: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="weight" className="text-sm font-medium">
                Peso (kg)
              </label>
              <Input
                id="weight"
                placeholder="Peso"
                value={player.weight}
                onChange={(e) => setPlayer({ ...player, weight: e.target.value })}
              />
            </div>
            <Button type="submit" className={`w-full relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border hover:shadow-lg`}>
              {initialData ? "Guardar Cambios" : "Añadir Jugador"}
            </Button>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
