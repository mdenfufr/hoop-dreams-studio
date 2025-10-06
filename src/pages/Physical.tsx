
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { CategoryCard } from "@/components/dashboard/CategoryCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";
import { getOrganizationLogo } from '@/config/organizationLogos';
import { PreloadedImage } from "@/components/ui/preloaded-image";

export default function Physical() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { getGradientClasses, getTextColor, theme, organizationId } = useOrganizationTheme();
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [seasonName, setSeasonName] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [maintainView, setMaintainView] = useState<boolean>(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isSenior, setIsSenior] = useState<boolean>(false);
  const [selectedSeniorSeason, setSelectedSeniorSeason] = useState<string | null>(null);
  const [selectedSeniorCategory, setSelectedSeniorCategory] = useState<string | null>(null);

  // Check for state on navigation
  useEffect(() => {
    if (location.state) {
      if (location.state.selectedSeason) {
        setSelectedSeason(location.state.selectedSeason);
      }
      if (location.state.selectedCategory) {
        setSelectedCategory(location.state.selectedCategory);
      }
      if (location.state.seasonName) {
        setSeasonName(location.state.seasonName);
      }
      if (location.state.categoryName) {
        setCategoryName(location.state.categoryName);
      }
      if (location.state.maintainView) {
        setMaintainView(true);
      }
      
      // Clear state to avoid reapplying it on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Resetear al inicio cuando se reciba el parámetro ?home=1
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('home') === '1') {
      setSelectedSeason(null);
      setSelectedCategory(null);
      setSeasonName(null);
      setCategoryName(null);
      setMaintainView(false);
    }
  }, [location.search]);

  // Fetch youth seasons
  const { data: seasons = [] } = useQuery({
    queryKey: ["seasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch senior seasons
  const { data: seniorSeasons = [] } = useQuery({
    queryKey: ["senior_seasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("senior_seasons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch categories for selected youth season
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", selectedSeason],
    queryFn: async () => {
      if (!selectedSeason) return [];
      
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq('season_id', selectedSeason)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSeason,
  });

  // Fetch categories for selected senior season
  const { data: seniorCategories = [] } = useQuery({
    queryKey: ["senior_categories", selectedSeniorSeason],
    queryFn: async () => {
      if (!selectedSeniorSeason) return [];
      
      const { data, error } = await supabase
        .from("senior_categories")
        .select("*")
        .eq('senior_season_id', selectedSeniorSeason)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSeniorSeason,
  });

  // Create physical evaluation when season is selected
  const handleSeasonSelect = async (seasonId: string) => {
    setSelectedSeason(seasonId);
    setSelectedCategory(null);
    setMaintainView(false);
    
    // Update season name
    const selectedSeasonObj = seasons.find(s => s.id === seasonId);
    if (selectedSeasonObj) {
      setSeasonName(selectedSeasonObj.name);
    }
    
    // Check if an evaluation already exists for this season
    const { data: existingEvaluation, error: checkError } = await supabase
      .from("physical_evaluations")
      .select("id")
      .eq("season_id", seasonId)
      .single();

    if (checkError && checkError.code !== "PGRST116") { // PGRST116 is "no rows returned"
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al verificar la evaluación física",
      });
      return;
    }

    // If no evaluation exists, create one
    if (!existingEvaluation) {
      const { error: createError } = await supabase
        .from("physical_evaluations")
        .insert([{ season_id: seasonId }]);

      if (createError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error al crear la evaluación física",
        });
        return;
      }
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setMaintainView(false);
    
    // Update category name
    const selectedCategoryObj = categories.find(c => c.id === categoryId);
    if (selectedCategoryObj) {
      setCategoryName(selectedCategoryObj.name);
    }
  };

  const navigateToLoadControl = () => {
    navigate("/dashboard/physical/load-control", {
      state: {
        seasonId: isSenior ? null : selectedSeason,
        categoryId: isSenior ? null : selectedCategory,
        seniorSeasonId: isSenior ? selectedSeniorSeason : null,
        seniorCategoryId: isSenior ? selectedSeniorCategory : null,
        seasonName: seasonName,
        categoryName: categoryName
      }
    });
  };

  const navigateToEvaluations = () => {
    navigate("/dashboard/physical/evaluations", {
      state: {
        seasonId: isSenior ? null : selectedSeason,
        categoryId: isSenior ? null : selectedCategory,
        seniorSeasonId: isSenior ? selectedSeniorSeason : null,
        seniorCategoryId: isSenior ? selectedSeniorCategory : null,
        seasonName: seasonName,
        categoryName: categoryName
      }
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
            <h1 className={`text-5xl font-black uppercase font-handel-gothic flex-1 antialiased text-white`}>
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
        
        {/* Content with top padding to account for fixed header */}
        <div className="pt-32 p-8">
        <h1 className="text-2xl font-bold mb-6 mt-8">Parte Física</h1>

        {!selectedSeason && !selectedSeniorSeason && !maintainView && (
          <div className="bg-white rounded-lg shadow p-6 mt-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Seleccionar Temporada</h2>
            </div>
            
            {/* Fútbol Joven */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 text-gray-700">Fútbol Joven</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {seasons.map((season) => (
                  <div 
                    key={season.id} 
                    className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl p-4 transition-all duration-300 shadow-2xl transform hover:scale-105 cursor-pointer`}
                    onClick={() => {
                      setIsSenior(false);
                      handleSeasonSelect(season.id);
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                    <div className="relative flex justify-between items-center">
                      <span className="text-left flex-grow text-primary-foreground font-rajdhani font-semibold uppercase tracking-wider">{season.name}</span>
                    </div>
                    <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fútbol Primer Equipo */}
            <div>
              <h3 className="text-lg font-medium mb-3 text-gray-700">Fútbol Primer Equipo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {seniorSeasons.map((season) => (
                  <div 
                    key={season.id} 
                    className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl p-4 transition-all duration-300 shadow-2xl transform hover:scale-105 cursor-pointer`}
                    onClick={() => {
                      setIsSenior(true);
                      setSelectedSeniorSeason(season.id);
                      setSelectedCategory(null);
                      setMaintainView(false);
                      setSeasonName(season.name);
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                    <div className="relative flex justify-between items-center">
                      <span className="text-left flex-grow text-primary-foreground font-rajdhani font-semibold uppercase tracking-wider">{season.name}</span>
                    </div>
                    <div className="absolute top-1 right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(selectedSeason || selectedSeniorSeason) && !selectedCategory && !selectedSeniorCategory && !maintainView && (
          <>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedSeason(null);
                  setSelectedSeniorSeason(null);
                  setIsSenior(false);
                  setMaintainView(false);
                }}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Volver
              </button>
              <h2 className="text-xl font-semibold">
                Temporada: {seasonName || (isSenior ? seniorSeasons.find(s => s.id === selectedSeniorSeason)?.name : seasons.find(s => s.id === selectedSeason)?.name)}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {!isSenior && categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  id={category.id}
                  name={category.name}
                  onAddPlayer={() => {}}
                  onAddMatch={() => {}}
                  onShowPlayers={() => handleCategorySelect(category.id)}
                  hideActions={true}
                />
              ))}
              {isSenior && seniorCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  id={category.id}
                  name={category.name}
                  onAddPlayer={() => {}}
                  onAddMatch={() => {}}
                  onShowPlayers={() => {
                    setSelectedSeniorCategory(category.id);
                    setCategoryName(category.name);
                    setMaintainView(false);
                  }}
                  hideActions={true}
                />
              ))}
            </div>
          </>
        )}

        {(selectedCategory || selectedSeniorCategory || maintainView) && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => {
                  if (maintainView) {
                    setMaintainView(false);
                  } else {
                    setSelectedCategory(null);
                    setSelectedSeniorCategory(null);
                  }
                }}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Volver
              </button>
              <h2 className="text-xl font-semibold">
                Temporada: {seasonName || (isSenior ? seniorSeasons.find(s => s.id === selectedSeniorSeason)?.name : seasons.find(s => s.id === selectedSeason)?.name)} - 
                Categoría: {categoryName || (isSenior ? seniorCategories.find(c => c.id === selectedSeniorCategory)?.name : categories.find(c => c.id === selectedCategory)?.name)}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* Card for Control de Carga */}
              <Card 
                className="hover:shadow-lg transition-shadow cursor-pointer h-60"
                onClick={navigateToLoadControl}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                  <Dumbbell className="h-16 w-16 mb-4 text-primary" />
                  <h3 className="text-xl font-semibold text-center">Control de Carga</h3>
                  <p className="text-gray-500 text-center mt-2">Gestión y monitoreo de la carga de entrenamiento</p>
                </CardContent>
              </Card>

              {/* Card for Evaluaciones Físicas */}
              <Card 
                className="hover:shadow-lg transition-shadow cursor-pointer h-60"
                onClick={navigateToEvaluations}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                  <ClipboardList className="h-16 w-16 mb-4 text-primary" />
                  <h3 className="text-xl font-semibold text-center">Evaluaciones Físicas</h3>
                  <p className="text-gray-500 text-center mt-2">Seguimiento de evaluaciones de rendimiento físico</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
        </div>
      </main>
    </div>
  );
}
