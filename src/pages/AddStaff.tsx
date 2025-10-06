import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";
import { DeleteConfirmationDialog } from "@/components/modals/DeleteConfirmationDialog";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";
import { getOrganizationLogo } from '@/config/organizationLogos';
import { PreloadedImage } from "@/components/ui/preloaded-image";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  senior_football_access?: string;
  football_access?: string;
  medical_players_access?: string;
  medical_staff_access?: string;
  physical_access?: string;
  youth_records_access?: string;
  staff_access?: string;
}

interface PlayerData {
  id: string;
  email: string | null;
  name: string;
  created_at: string;
  senior_football_access?: string;
  football_access?: string;
  medical_players_access?: string;
  medical_staff_access?: string;
  physical_access?: string;
  youth_records_access?: string;
  staff_access?: string;
}

const sections = [
  { id: "senior_football", label: "Fútbol Primer Equipo" },
  { id: "football", label: "Fútbol Joven" },
  { id: "medical_players", label: "Parte Médica Jugadores" },
  { id: "medical_staff", label: "Parte Médica Personal" },
  { id: "physical", label: "Parte Física" },
  { id: "youth_records", label: "Ficha Juveniles" },
];

const accessLevels = [
  { value: "editor", label: "Editor" },
  { value: "visualizador", label: "Visualizador" },
  { value: "sin_acceso", label: "Sin Acceso" },
];

export default function AddStaff() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    senior_football_access: "sin_acceso",
    football_access: "sin_acceso",
    medical_players_access: "sin_acceso",
    medical_staff_access: "sin_acceso",
    physical_access: "sin_acceso",
    youth_records_access: "sin_acceso",
    staff_access: "sin_acceso",
  });
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [playerDeleteDialogOpen, setPlayerDeleteDialogOpen] = useState(false);
  const [selectedPlayerToDelete, setSelectedPlayerToDelete] = useState<PlayerData | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canEdit, userId, organizationId } = usePermissions();
  const location = useLocation();
  const { getGradientClasses, theme } = useOrganizationTheme();
  const [defaultSeniorCategoryId, setDefaultSeniorCategoryId] = useState<string | null>(null);

  const hasEditPermission = canEdit('staff');

  useEffect(() => {
    setCurrentUserId(userId);
  }, [userId]);

  // Resetear al inicio cuando se reciba el parámetro ?home=1
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('home') === '1') {
      setFormData({
        email: "",
        password: "",
        senior_football_access: "sin_acceso",
        football_access: "sin_acceso",
        medical_players_access: "sin_acceso",
        medical_staff_access: "sin_acceso",
        physical_access: "sin_acceso",
        youth_records_access: "sin_acceso",
        staff_access: "sin_acceso",
      });
      setDialogOpen(false);
      setSelectedUser(null);
      setIsEditing(false);
      setDeleteDialogOpen(false);
      setCurrentUserId(null);
      setPlayerDeleteDialogOpen(false);
      setSelectedPlayerToDelete(null);
    }
  }, [location.search]);

  useEffect(() => {
    const loadDefaultSeniorCategory = async () => {
      if (!organizationId) return;
      const { data, error } = await supabase
        .from('senior_categories')
        .select('id')
        .eq('organization_id', organizationId);
      if (!error && data && data.length === 1) {
        setDefaultSeniorCategoryId(data[0].id);
      }
    };
    loadDefaultSeniorCategory();
  }, [organizationId]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', organizationId],
    queryFn: async () => {
      // Obtener los emails de usuarios que son jugadores de la misma organización
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('email')
        .eq('organization_id', organizationId)
        .not('email', 'is', null);

      if (playersError) {
        console.error("Error al obtener jugadores:", playersError);
      }

      const playerEmails = playersData?.map(p => p.email).filter(Boolean) || [];

      // Obtener usuarios de la misma organización que no sean jugadores
      let query = supabase
        .from('users')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      // Si hay emails de jugadores, filtrarlos
      if (playerEmails.length > 0) {
        query = query.not('email', 'in', `(${playerEmails.map(email => `"${email}"`).join(',')})`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error al obtener usuarios:", error);
        throw error;
      }
      
      return data as UserData[];
    },
  });

  const { data: players, isLoading: isLoadingPlayers } = useQuery({
    queryKey: ['players-with-permissions', organizationId],
    queryFn: async () => {
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, email, name, created_at, user_id')
        .eq('organization_id', organizationId)
        .eq('is_deleted', false)
        .not('user_id', 'is', null)
        .order('created_at', { ascending: false });

      if (playersError) {
        console.error("Error al obtener jugadores:", playersError);
        throw playersError;
      }

      // Obtener permisos de los usuarios que coinciden con los emails de jugadores
      const playerEmails = playersData?.map(p => p.email).filter(Boolean) || [];
      let usersData = [];
      
      if (playerEmails.length > 0) {
        const { data: userData, error: usersError } = await supabase
          .from('users')
          .select('email, senior_football_access, football_access, medical_players_access, medical_staff_access, physical_access, youth_records_access, staff_access')
          .in('email', playerEmails);

        if (usersError) {
          console.error("Error al obtener permisos de usuarios:", usersError);
        } else {
          usersData = userData || [];
        }
      }

      // Combinar datos de jugadores con sus permisos
      const playersWithPermissions = playersData?.map(player => {
        const userPermissions = usersData.find(user => user.email === player.email);
        return {
          ...player,
          senior_football_access: userPermissions?.senior_football_access || 'sin_acceso',
          football_access: userPermissions?.football_access || 'sin_acceso',
          medical_players_access: userPermissions?.medical_players_access || 'sin_acceso',
          medical_staff_access: userPermissions?.medical_staff_access || 'sin_acceso',
          physical_access: userPermissions?.physical_access || 'sin_acceso',
          youth_records_access: userPermissions?.youth_records_access || 'sin_acceso',
          staff_access: userPermissions?.staff_access || 'sin_acceso',
        };
      }) || [];
      
      return playersWithPermissions;
    },
  });

  const handleEdit = (user: UserData) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: "",
      senior_football_access: user.senior_football_access || "sin_acceso",
      football_access: user.football_access || "sin_acceso",
      medical_players_access: user.medical_players_access || "sin_acceso",
      medical_staff_access: user.medical_staff_access || "sin_acceso",
      physical_access: user.physical_access || "sin_acceso",
      youth_records_access: user.youth_records_access || "sin_acceso",
      staff_access: user.staff_access || "sin_acceso",
    });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDeleteConfirm = (user: UserData) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No session found. Please log in again.");
      }
      
      const supabaseUrl = new URL(import.meta.env.VITE_SUPABASE_URL || "https://pdrpxdgzosnuysuzzprr.supabase.co");
      const functionUrl = `${supabaseUrl.origin}/functions/v1/delete-user`;
      
      console.log("Calling delete function at:", functionUrl);
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id
        })
      });
      
      if (!response.ok) {
        const errorStatus = response.status;
        let errorData;
        
        try {
          errorData = await response.json();
          console.error("Error response data:", errorData);
        } catch (e) {
          const errorText = await response.text();
          console.error("Error text response:", errorText);
          throw new Error(`Error (${errorStatus}): ${errorText || "Unknown error occurred"}`);
        }
        
        throw new Error(errorData.error || errorData.message || `Error (${errorStatus}): Unknown error occurred`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Error al eliminar el usuario");
      }
      
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      
      toast({
        title: "Éxito",
        description: "Usuario eliminado correctamente",
      });
      
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error("Error al eliminar usuario:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo eliminar el usuario",
      });
    }
  };

  const handleDeletePlayerConfirm = (player: PlayerData) => {
    setSelectedPlayerToDelete(player);
    setPlayerDeleteDialogOpen(true);
  };

  const handleDeletePlayer = async () => {
    if (!selectedPlayerToDelete) return;
    
    try {
      // Usar la nueva función de base de datos para eliminar jugador
      const { data, error } = await supabase.rpc('delete_player_and_user', {
        player_id_param: selectedPlayerToDelete.id
      });

      if (error) {
        console.error("Error al eliminar jugador:", error);
        throw error;
      }

      // Verificar el tipo de respuesta y hacer cast si es necesario
      const result = data as { success: boolean; error?: string; user_id?: string; message?: string };

      // Verificar si la operación fue exitosa
      if (!result.success) {
        throw new Error(result.error || "Error desconocido al eliminar jugador");
      }

      // Si el jugador tenía user_id, también usar el edge function para eliminar de auth
      if (result.user_id) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            const supabaseUrl = new URL(import.meta.env.VITE_SUPABASE_URL || "https://pdrpxdgzosnuysuzzprr.supabase.co");
            const functionUrl = `${supabaseUrl.origin}/functions/v1/delete-user`;
            
            await fetch(functionUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                userId: result.user_id
              })
            });
          }
        } catch (authError) {
          console.error("Error eliminando cuenta de autenticación:", authError);
          // Continuar aunque falle la eliminación de auth, ya que el jugador ya fue eliminado
        }
      }
      
      await queryClient.invalidateQueries({ queryKey: ['players-with-permissions'] });
      
      toast({
        title: "Éxito",
        description: "Jugador eliminado correctamente",
      });
      
      setPlayerDeleteDialogOpen(false);
      setSelectedPlayerToDelete(null);
    } catch (error: any) {
      console.error("Error al eliminar jugador:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo eliminar el jugador",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && selectedUser) {
        console.log("Updating user:", selectedUser.id);
        console.log("Form data:", formData);
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error("No session found. Please log in again.");
        }
        
        const supabaseUrl = new URL(import.meta.env.VITE_SUPABASE_URL || "https://pdrpxdgzosnuysuzzprr.supabase.co");
        const functionUrl = `${supabaseUrl.origin}/functions/v1/update-user`;
        
        console.log("Calling function at:", functionUrl);
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            userId: selectedUser.id,
            userData: {
              senior_football_access: formData.senior_football_access,
              football_access: formData.football_access,
              medical_players_access: formData.medical_players_access,
              medical_staff_access: formData.medical_staff_access,
              physical_access: formData.physical_access,
              youth_records_access: formData.youth_records_access,
              staff_access: formData.staff_access,
              ...(formData.password ? { password: formData.password } : {})
            }
          })
        });
        
        if (!response.ok) {
          const errorStatus = response.status;
          let errorMessage = `Error (${errorStatus})`;
          
          try {
            const errorText = await response.text();
            console.error("Error response:", errorText);
            
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (e) {
              errorMessage = errorText || errorMessage;
            }
          } catch (e) {
            console.error("Failed to parse error response:", e);
          }
          
          throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || "Error al actualizar el usuario");
        }
        
        toast({
          title: "Éxito",
          description: "Usuario actualizado correctamente",
        });
      } else {
        console.log("Creando nuevo usuario con:", formData);
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              senior_football_access: formData.senior_football_access,
              football_access: formData.football_access,
              medical_players_access: formData.medical_players_access,
              medical_staff_access: formData.medical_staff_access,
              physical_access: formData.physical_access,
              youth_records_access: formData.youth_records_access,
              staff_access: formData.staff_access,
              organization_id: organizationId || null,
              senior_category_id: defaultSeniorCategoryId || null
            }
          }
        });

        if (authError) {
          console.error("Error en auth.signUp:", authError);
          throw authError;
        }

        console.log("Usuario creado exitosamente:", authData);
        
        toast({
          title: "Éxito",
          description: "Usuario creado correctamente",
        });
      }
      
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      
      setFormData({
        email: "",
        password: "",
        senior_football_access: "sin_acceso",
        football_access: "sin_acceso",
        medical_players_access: "sin_acceso",
        medical_staff_access: "sin_acceso",
        physical_access: "sin_acceso",
        youth_records_access: "sin_acceso",
        staff_access: "sin_acceso",
      });
      setDialogOpen(false);
      setIsEditing(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error("Error completo:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Ocurrió un error inesperado",
      });
    }
  };

  const formatAccessLevel = (level: string | undefined) => {
    switch(level) {
      case 'editor': return 'Editor';
      case 'visualizador': return 'Visualizador';
      case 'sin_acceso': return 'Sin Acceso';
      default: return 'Sin Acceso';
    }
  };

  const handleAccessChange = (section: string, value: string) => {
    console.log(`Cambiando acceso de ${section} a ${value}`);
    setFormData(prev => ({
      ...prev,
      [`${section}_access`]: value
    }));
  };

  const canEditUser = (userId: string) => {
    return hasEditPermission;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center animate-pulse">
            <div className="h-8 w-32 bg-gray-200 rounded mb-4 mx-auto"></div>
            <div className="h-64 w-full max-w-3xl bg-gray-100 rounded-lg mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar isVisible={sidebarVisible} onToggle={() => setSidebarVisible(!sidebarVisible)} />
      <main className="flex-1 relative">
        {/* Fixed Header Banner */}
        <div className={`sticky top-0 z-40 bg-gradient-to-br ${getGradientClasses('primary')}/80 backdrop-blur-md overflow-hidden transition-all duration-300 w-full`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 0 100%)' }}></div>
          <div className="relative flex items-center justify-between px-8 py-6">
            <button 
              onClick={() => setSidebarVisible(!sidebarVisible)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200 mr-4 z-10"
              aria-label="Toggle sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 
              className="text-5xl font-black uppercase font-handel-gothic flex-1 antialiased text-white whitespace-nowrap truncate"
            >
              {theme?.name?.toUpperCase() || 'O\'HIGGINS FC'}
            </h1>
            <div className="w-20 h-20 flex items-center justify-center">
          <PreloadedImage 
            src={getOrganizationLogo(organizationId)} 
            alt="Logo" 
            className="w-18 h-18 object-contain" 
          />
            </div>
          </div>
        </div>
        
        {/* Title directly below header */}
        <div className="px-8 py-4 bg-background border-b">
          <h2 className="text-2xl font-bold">Personal</h2>
        </div>
        
        {/* Content with padding */}
        <div className="p-8">
        
        <Tabs defaultValue="staff" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="staff">Personal</TabsTrigger>
            <TabsTrigger value="players">Jugadores</TabsTrigger>
          </TabsList>

          <TabsContent value="staff" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Gestión de Personal</h3>
              {hasEditPermission && (
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) {
                    setIsEditing(false);
                    setSelectedUser(null);
                    setFormData({
                      email: "",
                      password: "",
                      senior_football_access: "sin_acceso",
                      football_access: "sin_acceso",
                      medical_players_access: "sin_acceso",
                      medical_staff_access: "sin_acceso",
                      physical_access: "sin_acceso",
                      youth_records_access: "sin_acceso",
                      staff_access: "sin_acceso",
                    });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border/30 rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 hover:shadow-lg gap-2`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                      <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                      <div className="relative flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4 text-primary-foreground" />
                        <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                          Añadir Usuario
                        </span>
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                      <DialogTitle>{isEditing ? "Editar Usuario" : "Añadir Usuario"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          readOnly={isEditing}
                          className={isEditing ? "bg-gray-100" : ""}
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Contraseña {isEditing && "(Dejar en blanco para mantener la actual)"}</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required={!isEditing}
                        />
                      </div>
                      
                      <div>
                        <Label className="mb-2 block">Permisos de Acceso</Label>
                        <div className="mt-2 space-y-6">
                          {sections.map((section) => (
                            <div key={section.id} className="mb-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">{section.label}</h4>
                                <div className="flex border rounded-md">
                                  {accessLevels.map((level) => (
                                    <button
                                      key={level.value}
                                      type="button"
                                      className={`px-3 py-1.5 text-xs transition-colors ${
                                        formData[`${section.id}_access` as keyof typeof formData] === level.value
                                          ? "bg-primary text-white"
                                          : "hover:bg-gray-100"
                                      }`}
                                      onClick={() => handleAccessChange(section.id, level.value)}
                                    >
                                      {level.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <Separator className="my-2" />
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <Button type="submit" className="w-full">
                        {isEditing ? "Actualizar Usuario" : "Guardar Usuario"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Fútbol Primer Equipo</TableHead>
                    <TableHead>Fútbol Joven</TableHead>
                    <TableHead>Parte Médica Jugadores</TableHead>
                    <TableHead>Parte Médica Personal</TableHead>
                    <TableHead>Parte Física</TableHead>
                    <TableHead>Ficha Juveniles</TableHead>
                    <TableHead>Fecha de Creación</TableHead>
                    {hasEditPermission && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id} className={user.id === currentUserId ? "bg-gray-50" : ""}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{formatAccessLevel(user.senior_football_access)}</TableCell>
                      <TableCell>{formatAccessLevel(user.football_access)}</TableCell>
                      <TableCell>{formatAccessLevel(user.medical_players_access)}</TableCell>
                      <TableCell>{formatAccessLevel(user.medical_staff_access)}</TableCell>
                      <TableCell>{formatAccessLevel(user.physical_access)}</TableCell>
                      <TableCell>{formatAccessLevel(user.youth_records_access)}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      {hasEditPermission && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canEditUser(user.id) && (
                                <>
                                  <DropdownMenuItem onClick={() => handleEdit(user)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteConfirm(user)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </>
                              )}
                              {!canEditUser(user.id) && (
                                <DropdownMenuItem disabled className="text-gray-400">
                                  No tienes permiso
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="players" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Jugadores Registrados</h3>
              <div className="text-sm text-muted-foreground">
                Gestión de jugadores con acceso al sistema
              </div>
            </div>

            {isLoadingPlayers ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center animate-pulse">
                  <div className="h-8 w-32 bg-gray-200 rounded mb-4 mx-auto"></div>
                  <div className="h-64 w-full max-w-3xl bg-gray-100 rounded-lg mx-auto"></div>
                </div>
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Fútbol Primer Equipo</TableHead>
                      <TableHead>Fútbol Joven</TableHead>
                      <TableHead>Parte Médica Jugadores</TableHead>
                      <TableHead>Parte Médica Personal</TableHead>
                      <TableHead>Parte Física</TableHead>
                      <TableHead>Ficha Juveniles</TableHead>
                      <TableHead>Fecha de Creación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {players?.map((player) => (
                       <TableRow key={player.id}>
                         <TableCell>{player.email || "Sin email"}</TableCell>
                         <TableCell>{player.name}</TableCell>
                         <TableCell>{formatAccessLevel(player.senior_football_access)}</TableCell>
                         <TableCell>{formatAccessLevel(player.football_access)}</TableCell>
                         <TableCell>{formatAccessLevel(player.medical_players_access)}</TableCell>
                         <TableCell>{formatAccessLevel(player.medical_staff_access)}</TableCell>
                         <TableCell>{formatAccessLevel(player.physical_access)}</TableCell>
                         <TableCell>{formatAccessLevel(player.youth_records_access)}</TableCell>
                         <TableCell>{new Date(player.created_at).toLocaleDateString()}</TableCell>
                         </TableRow>
                     ))}
                     {players?.length === 0 && (
                         <TableRow>
                           <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                             No hay jugadores registrados
                           </TableCell>
                         </TableRow>
                     )}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <DeleteConfirmationDialog 
          isOpen={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDeleteUser}
          title="¿Eliminar usuario?"
          description={`¿Estás seguro de que deseas eliminar el usuario "${selectedUser?.email}"? Esta acción no se puede deshacer.`}
        />

        <DeleteConfirmationDialog 
          isOpen={playerDeleteDialogOpen}
          onClose={() => setPlayerDeleteDialogOpen(false)}
          onConfirm={handleDeletePlayer}
          title="¿Eliminar jugador?"
          description={`¿Estás seguro de que deseas eliminar el jugador "${selectedPlayerToDelete?.name}" y su cuenta de usuario? Esta acción no se puede deshacer.`}
        />
        </div>
      </main>
    </div>
  );
}

