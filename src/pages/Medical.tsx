
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { CategoryCard } from "@/components/dashboard/CategoryCard";
import { RPEScale } from "@/components/medical/RPEScale";
import { WellnessForm } from "@/components/medical/WellnessForm";
import { BodyModel3D } from "@/components/medical/BodyModel3D";
import { AilmentForm } from "@/components/medical/AilmentForm";
import { AilmentsList } from "@/components/medical/AilmentsList";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";
import { getOrganizationLogo } from '@/config/organizationLogos';
import { PreloadedImage } from "@/components/ui/preloaded-image";

export default function Medical() {
  const [activeTab, setActiveTab] = useState("checkin");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const { theme, organizationId, getGradientClasses } = useOrganizationTheme();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showBodyModel, setShowBodyModel] = useState(false);
  const [showNewAilmentForm, setShowNewAilmentForm] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const location = useLocation();

  // Obtener el player_id del usuario autenticado
  useEffect(() => {
    const getCurrentPlayer = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: player } = await supabase
          .from('players')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (player) {
          setCurrentPlayerId(player.id);
        }
      }
    };

    getCurrentPlayer();
  }, []);

  // Resetear al inicio cuando se reciba el parámetro ?home=1
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('home') === '1') {
      setActiveTab('checkin');
      setSelectedCategory(null);
      setSelectedPlayer(null);
      setShowBodyModel(false);
      setShowNewAilmentForm(false);
    }
  }, [location.search]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las categorías",
        });
        return [];
      }
      
      return data;
    },
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("category_id", selectedCategory)
        .order("name");
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los jugadores",
        });
        return [];
      }
      
      return data;
    },
    enabled: !!selectedCategory,
  });

  const handleShowPlayers = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedPlayer(null);
    setShowBodyModel(false);
  };

  const handleRPESubmit = (rpe: number, minutes: number, internalLoad: number) => {
    toast({
      title: "Carga interna calculada",
      description: `RPE: ${rpe}, Minutos: ${minutes}, Carga interna: ${internalLoad}`,
    });
  };

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayer(playerId);
    setShowBodyModel(false);
  };

  const handleWellnessSubmit = () => {
    setShowBodyModel(true);
  };

  const handleBodyModelSubmit = () => {
    setShowBodyModel(false);
    setSelectedPlayer(null);
    setSelectedCategory(null);
  };

  const handleAilmentSubmit = () => {
    setShowNewAilmentForm(false);
    toast({
      title: "Éxito",
      description: "Registro de dolencia guardado correctamente",
    });
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar isVisible={sidebarVisible} onToggle={() => setSidebarVisible(!sidebarVisible)} />
      <main className="flex-1 relative">
        {/* Fixed Header Banner */}
        <div className={`fixed top-0 right-0 z-40 bg-gradient-to-br ${getGradientClasses('primary')}/80 backdrop-blur-md overflow-hidden transition-all duration-300 ${sidebarVisible ? 'left-64' : 'left-0'}`}>
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
              className="text-5xl font-black uppercase font-handel-gothic flex-1 antialiased text-white"
            >
              {theme?.name?.toUpperCase()}
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
        
        {/* Content with top padding to account for fixed header */}
        <div className="pt-32 p-8">
        <h1 className="text-2xl font-bold mb-4 mt-8">Parte Médica Jugadores</h1>
        
        <div className="flex gap-4 mb-8">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === "checkin"
                ? "bg-gradient-to-br " + getGradientClasses('primary') + " text-white"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("checkin")}
          >
            Check in
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === "checkout"
                ? "bg-gradient-to-br " + getGradientClasses('primary') + " text-white"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("checkout")}
          >
            Check out
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === "ailments"
                ? "bg-gradient-to-br " + getGradientClasses('primary') + " text-white"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("ailments")}
          >
            Enfermedades o malestares
          </button>
        </div>

        {activeTab === "checkin" && (
          <div className="mt-8">
            <Tabs defaultValue="wellness" className="space-y-8">
              <TabsList>
                <TabsTrigger value="wellness">Formulario Wellness</TabsTrigger>
                <TabsTrigger value="muscular">Molestia Muscular</TabsTrigger>
              </TabsList>

              <TabsContent value="wellness" className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Formulario Wellness</h2>
                <WellnessForm 
                  playerId={currentPlayerId || ""} 
                  onSubmit={handleWellnessSubmit}
                  skipPlayerIdValidation={false}
                />
              </TabsContent>

              <TabsContent value="muscular" className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Molestia Muscular</h2>
                <BodyModel3D 
                  playerId={currentPlayerId || ""}
                  onSubmit={handleBodyModelSubmit}
                  skipPlayerIdValidation={false}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {activeTab === "checkout" && (
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Check out</h2>
              <RPEScale 
                onSubmit={handleRPESubmit} 
                playerId={currentPlayerId || ""}
              />
            </div>
          </div>
        )}

        {activeTab === "ailments" && (
          <div className="mt-8">
            <div className="space-y-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Registro de dolencias</h2>
                  <Button
                    onClick={() => setShowNewAilmentForm(true)}
                    className={`bg-gradient-to-br ${getGradientClasses('primary')} text-white ${getGradientClasses('hover')}`}
                  >
                    Agregar nuevo registro
                  </Button>
                </div>
                <AilmentsList playerId={currentPlayerId || ""} hideStatusColumn={true} />
              </div>
            </div>

            <Dialog open={showNewAilmentForm} onOpenChange={setShowNewAilmentForm}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nuevo registro de dolencia</DialogTitle>
                  <DialogDescription>
                    Ingresa los detalles de la dolencia para registrarla en el sistema.
                  </DialogDescription>
                </DialogHeader>
                <AilmentForm 
                  playerId={currentPlayerId || ""}
                  onSubmit={handleAilmentSubmit}
                  skipPlayerIdValidation={false}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
