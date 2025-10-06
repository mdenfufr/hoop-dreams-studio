
import { useState, useEffect } from "react";
import { Activity, UserCog, LogOut, UserPlus, Users, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { removeBackground, loadImage } from "@/utils/backgroundRemoval";
import { SoccerBallIcon } from "@/components/icons/SoccerBallIcon";
import { FitnessIcon } from "@/components/icons/FitnessIcon";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

const menuItems = [
  { name: "Fútbol Primer Equipo", icon: SoccerBallIcon, path: "/dashboard", permissionSection: "football" },
  { name: "Fútbol Joven", icon: SoccerBallIcon, path: "/dashboard/youth-football", permissionSection: "football" },
  { name: "Parte Médica Jugadores", icon: Activity, path: "/dashboard/medical", permissionSection: "medical" },
  { name: "Parte Médica Personal", icon: Activity, path: "/dashboard/medical-staff", permissionSection: "medical_staff" },
  { name: "Parte Física", icon: FitnessIcon, path: "/dashboard/physical", permissionSection: "physical" },
  { name: "Ficha Juveniles", icon: Users, path: "/dashboard/youth-players", permissionSection: "youth_records" },
  { name: "Añadir Personal", icon: UserPlus, path: "/dashboard/add-staff", permissionSection: "staff" },
  { name: "Cerrar Sesión", icon: LogOut, path: "/login" },
];

interface SidebarProps {
  isVisible?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ isVisible = true, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [logoSrc, setLogoSrc] = useState("/lovable-uploads/36281024-3c0d-4d53-bc3d-415fce000b14.png");
  const { getGradientClasses, getOverlayColor, getTextColor } = useOrganizationTheme();
  const fetchCurrentUser = async () => {
    setIsLoadingUser(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log("Usuario autenticado en Sidebar:", user.id);
        console.log("Email del usuario en Sidebar:", user.email);
        setUserEmail(user.email);
        setUserId(user.id);
        
        // Get user's organization_id
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          setOrganizationId(userData.organization_id);
        }
      } else {
        console.error("No hay usuario autenticado");
        navigate("/login");
      }
    } catch (error) {
      console.error("Error al obtener usuario:", error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate('/login');
      } else if (event === 'SIGNED_IN') {
        fetchCurrentUser();
      }
    });

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [navigate]);

  const handleNavigation = async (path: string, name: string) => {
    if (name === "Cerrar Sesión") {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        toast({
          title: "Sesión cerrada",
          description: "Has cerrado sesión exitosamente",
        });
        
        navigate("/login");
      } catch (error: any) {
        console.error("Error al cerrar sesión:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cerrar la sesión. Por favor, intenta nuevamente.",
        });
      }
      return;
    }

    const mainSections = ["Fútbol Primer Equipo", "Fútbol Joven", "Parte Médica Jugadores", "Parte Médica Personal", "Parte Física", "Ficha Juveniles", "Añadir Personal"];
    
    if (mainSections.includes(name)) {
      navigate(`${path}?home=1&ts=${Date.now()}`);
      return;
    }
    // Para el resto, ir a la ruta base de cada sección
    navigate(path, { replace: true });
  };
  
  if (!isVisible) {
    return null;
  }

  if (isLoadingUser) {
    return (
      <div data-sidebar className="h-screen bg-white border-r border-gray-200 flex flex-col items-center justify-center sticky top-0 transition-all duration-300 w-64">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 rounded mb-3"></div>
        </div>
      </div>
    );
  }

  return (
    <div data-sidebar className="h-screen border-r border-border flex flex-col bg-background sticky top-0 transition-all duration-300 w-64">
      
      {/* Logo */}
      {organizationId === 'c63c6669-d96e-4997-afc8-23a3bcda0c96' && (
        <div className="p-4 flex items-center justify-center">
          <img src="/lovable-uploads/61ee35bc-e23d-4d9e-b0d6-650401851bb4.png" alt="Logo" className="w-24 h-24" />
        </div>
      )}
      
      {/* User Info */}
      {userEmail && (
        <div className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl transition-all duration-300 shadow-2xl transform hover:scale-105 mx-2 mt-4 p-4`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
          <div className={`absolute inset-0 ${getOverlayColor()} rounded-xl backdrop-blur-sm`}></div>
          <div className="relative">
            <p className={`text-sm font-medium truncate ${getTextColor()} font-rajdhani`}>{userEmail}</p>
            <p className="text-xs text-muted-foreground mt-1 font-rajdhani">ID: {userId ? userId.substring(0, 8) + '...' : 'Desconocido'}</p>
          </div>
        </div>
      )}
      
      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-2 mt-3">
        {menuItems.map((item) => {
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.path, item.name)}
                className={cn(
                  `relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 w-[240px] h-12 block`,
                  item.name === "Cerrar Sesión" ? "mt-auto" : ""
                )}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
              <div className={`absolute inset-0 ${getOverlayColor()} rounded-xl backdrop-blur-sm`}></div>
              <div className="relative flex items-center h-full justify-start gap-2 px-2">
                <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
                  <item.icon className={`${item.name === "Parte Física" ? "w-9 h-9" : "w-5 h-5"} ${getTextColor()}`} />
                </div>
                <span className={`text-sm font-medium ${getTextColor()} text-left leading-tight truncate font-rajdhani`}>{item.name}</span>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
