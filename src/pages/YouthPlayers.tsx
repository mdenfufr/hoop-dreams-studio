import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { CategoryCard } from "@/components/dashboard/CategoryCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreVertical, FileDown, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/modals/DeleteConfirmationDialog";
import { PlayersList } from "@/components/dashboard/PlayersList";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { WorkSheet, WorkBook, utils as XLSXUtils, write as writeXLSX } from "xlsx";
import { DataBarChart } from "@/components/physical/DataBarChart";
import { PlayerStatsChart } from "@/components/players/PlayerStatsChart";
import { saveAs } from "file-saver";
import ReactDOMServer from 'react-dom/server';
import { useOrganizationTheme } from "@/hooks/use-organization-theme";
import { getOrganizationLogo } from '@/config/organizationLogos';
import { PreloadedImage } from "@/components/ui/preloaded-image";

interface Player {
  id: string;
  name: string;
  age: number | null;
  height: string | null;
  weight: string | null;
  position: string | null;
  image_url: string | null;
  jersey_number: string | null;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
}

export default function YouthPlayers() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [seasonToDelete, setSeasonToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const location = useLocation();
  const { getGradientClasses, theme, organizationId } = useOrganizationTheme();

  const queryClient = useQueryClient();

  // Resetear al inicio cuando se reciba el parámetro ?home=1
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('home') === '1') {
      setSelectedCategory(null);
      setSelectedSeason(null);
      setSearchQuery("");
      setSeasonToDelete(null);
      setShowDeleteConfirmation(false);
      setStartDate("");
      setEndDate("");
      setIsSearching(false);
    }
  }, [location.search]);

  const { data: seasons = [] } = useQuery({
    queryKey: ["seasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .order('created_at', { ascending: false });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las temporadas",
        });
        return [];
      }
      
      return data;
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories", selectedSeason],
    queryFn: async () => {
      if (!selectedSeason) return [];
      
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq('season_id', selectedSeason)
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
    enabled: !!selectedSeason,
  });

  const { data: searchResults = [] } = useQuery<Player[]>({
    queryKey: ["players", searchQuery, startDate, endDate, isSearching],
    queryFn: async () => {
      if (!searchQuery && !isSearching) return [];

      let query = supabase
        .from("players")
        .select("*");

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      if (startDate && endDate && isSearching) {
        query = query
          .gte('created_at', startDate)
          .lte('created_at', endDate);
      }

      const { data, error } = await query.order("name");
      
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
    enabled: searchQuery.length > 0 || isSearching,
  });

  // Query for football evaluations summary for search results
  const { data: playersEvaluations = {} } = useQuery({
    queryKey: ["players-evaluations", searchResults, startDate, endDate],
    queryFn: async () => {
      if (searchResults.length === 0) return {};

      const evaluationsMap: Record<string, any> = {};
      
      // Get evaluations for each player
      for (const player of searchResults) {
        let query = supabase
          .from("match_statistics")
          .select(`
            *,
            matches (
              date,
              opponent,
              categories (
                name,
                seasons (
                  name
                )
              )
            )
          `)
          .eq("player_id", player.id);

        // Apply date filter if dates are selected
        if (startDate && endDate) {
          query = query
            .gte("created_at", startDate)
            .lte("created_at", endDate);
        }

        const { data: evaluations, error } = await query.order("created_at", { ascending: false });

        if (!error && evaluations) {
          // Calculate summary statistics
          const totalEvaluations = evaluations.length;
          const totalGoals = evaluations.reduce((sum, evaluation) => sum + (evaluation.goals || 0), 0);
          const totalAssists = evaluations.reduce((sum, evaluation) => sum + (evaluation.assists || 0), 0);
          const totalMinutes = evaluations.reduce((sum, evaluation) => sum + (evaluation.minutes_played || 0), 0);
          const totalYellowCards = evaluations.reduce((sum, evaluation) => sum + (evaluation.yellow_cards || 0), 0);
          const totalRedCards = evaluations.reduce((sum, evaluation) => sum + (evaluation.red_cards || 0), 0);
          const totalSaves = evaluations.reduce((sum, evaluation) => sum + (evaluation.saves || 0), 0);
          const averageRating = totalEvaluations > 0 
            ? evaluations.reduce((sum, evaluation) => sum + (evaluation.rating || 0), 0) / totalEvaluations 
            : 0;

          evaluationsMap[player.id] = {
            totalEvaluations,
            totalGoals,
            totalAssists,
            totalMinutes,
            totalYellowCards,
            totalRedCards,
            totalSaves,
            averageRating: Math.round(averageRating * 10) / 10,
            evaluations: evaluations.slice(0, 5), // Last 5 evaluations for details
          };
        }
      }

      return evaluationsMap;
    },
    enabled: searchResults.length > 0,
  });

  // Query for match statistics (evaluations) for the selected category
  const { data: matchStats = [] } = useQuery({
    queryKey: ["match-statistics", selectedCategory, startDate, endDate],
    queryFn: async () => {
      if (!selectedCategory) return [];

      let query = supabase
        .from("match_statistics")
        .select(`
          *,
          matches (
            date,
            opponent,
            category_id
          )
        `)
        .eq("matches.category_id", selectedCategory);

      // Apply date filter if dates are selected
      if (startDate && endDate) {
        query = query
          .gte("created_at", startDate)
          .lte("created_at", endDate);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching match statistics:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!selectedCategory,
  });
  const { data: categoryPlayers = [] } = useQuery<Player[]>({
    queryKey: ["category-players", selectedCategory],
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

  const handleSeasonSelect = (seasonId: string) => {
    setSelectedSeason(seasonId);
    setSelectedCategory(null);
  };

  const handleBack = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
    } else if (selectedSeason) {
      setSelectedSeason(null);
    }
    setSearchQuery(""); // Clear search when going back
  };

  const handleDownloadPlayerHistory = async (playerId: string) => {
    console.log("Downloading history for player:", playerId);
  };

  const handleDownloadPlayerStats = async (playerId: string) => {
    if (!startDate || !endDate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor seleccione un rango de fechas",
      });
      return;
    }

    try {
      const { data: matchStats, error } = await supabase
        .from("match_statistics")
        .select(`
          *,
          matches (
            date,
            opponent
          )
        `)
        .eq("player_id", playerId)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (!matchStats || matchStats.length === 0) {
        toast({
          variant: "destructive",
          title: "Sin datos",
          description: "No hay estadísticas disponibles para el rango de fechas seleccionado",
        });
        return;
      }

      const excelData = matchStats.map((stat) => ({
        Fecha: format(new Date(stat.matches?.date || stat.created_at), "dd/MM/yyyy"),
        Rival: stat.matches?.opponent || "N/A",
        "Tarjetas Amarillas": stat.yellow_cards || 0,
        "Tarjetas Rojas": stat.red_cards || 0,
        Goles: stat.goals || 0,
        Asistencias: stat.assists || 0,
        "Minutos Jugados": stat.minutes_played || 0,
        Atajadas: stat.saves || 0,
        Centros: stat.crosses || 0,
        Calificación: stat.rating || 0,
        "Posición": stat.match_position || "N/A",
        Comentarios: stat.comments || "",
      }));

      const wb = XLSXUtils.book_new();
      
      const ws = XLSXUtils.json_to_sheet(excelData);
      XLSXUtils.book_append_sheet(wb, ws, "Estadísticas");

      const numericFields = [
        { field: "Goles", title: "Goles por Partido" },
        { field: "Asistencias", title: "Asistencias por Partido" },
        { field: "Tarjetas Amarillas", title: "Tarjetas Amarillas por Partido" },
        { field: "Tarjetas Rojas", title: "Tarjetas Rojas por Partido" },
        { field: "Minutos Jugados", title: "Minutos Jugados por Partido" },
        { field: "Atajadas", title: "Atajadas por Partido" },
        { field: "Centros", title: "Centros por Partido" },
        { field: "Calificación", title: "Calificación por Partido" },
      ];

      const chartsData = numericFields.map(({ field, title }) => ({
        title,
        data: matchStats.map((stat, index) => ({
          name: `vs ${stat.matches?.opponent || 'N/A'} (${format(new Date(stat.matches?.date || stat.created_at), "dd/MM/yyyy")})`,
          valor: stat[field.toLowerCase().replace(/ /g, '_')] || 0,
        })),
      }));

      let htmlContent = '<html><head><style>body { font-family: Arial; } .chart { margin: 20px; }</style></head><body>';
      htmlContent += '<h1>Gráficos de Estadísticas</h1>';
      
      chartsData.forEach(chartData => {
        const chartDiv = document.createElement('div');
        chartDiv.style.height = '400px';
        chartDiv.style.width = '100%';
        document.body.appendChild(chartDiv);

        const chart = document.createElement('div');
        chart.className = 'chart';
        chart.innerHTML = `
          <h2>${chartData.title}</h2>
          <div style="height: 300px;">
            ${ReactDOMServer.renderToString(
              <PlayerStatsChart data={chartData.data} title={chartData.title} />
            )}
          </div>
        `;
        htmlContent += chart.outerHTML;
      });

      htmlContent += '</body></html>';

      const fileName = `estadisticas_jugador_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
      const excelBuffer = writeXLSX(wb, { bookType: "xlsx", type: "array" });
      const excelBlob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(excelBlob, fileName);

      toast({
        title: "Éxito",
        description: "Estadísticas descargadas correctamente",
      });
    } catch (error) {
      console.error("Error downloading stats:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron descargar las estadísticas",
      });
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDateSearch = () => {
    if (startDate && endDate) {
      setIsSearching(true);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor ingrese ambas fechas",
      });
    }
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
        <div className="space-y-4">
          <h1 className="text-2xl font-bold mt-8">Ficha Juveniles</h1>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Buscar jugador..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex-1 min-w-[200px]">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Desde"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Hasta"
                />
              </div>
              <Button 
                onClick={handleDateSearch} 
                className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2 whitespace-nowrap`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                <div className="relative flex items-center justify-center gap-2">
                  <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                    Buscar
                  </span>
                </div>
              </Button>
            </div>
          </div>

          {(searchQuery || isSearching) && searchResults.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Jugador encontrado</h2>
              <PlayersList 
                players={searchResults}
                onEdit={() => {}}
                onDelete={() => {}}
                showDownloadButton={true}
                hideActions={true}
                dateFilter={{ 
                  startDate: startDate ? new Date(startDate) : undefined, 
                  endDate: endDate ? new Date(endDate) : undefined 
                }}
                evaluations={Object.values(playersEvaluations).flat()}
                filterByCategory={false}
              />
            </div>
          )}

          {(searchQuery || isSearching) && searchResults.length === 0 && (
            <div className="bg-white rounded-lg shadow p-6 mt-4">
              <p className="text-gray-500 text-center">No se encontraron jugadores</p>
            </div>
          )}

          {!searchQuery && !isSearching && (
            <>
              {!selectedSeason && (
                <div className="bg-white rounded-lg shadow p-6 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Seleccionar Temporada</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {seasons
                      .filter(season => 
                        season.name.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((season) => (
                        <div key={season.id} className={`relative bg-gradient-to-br ${getGradientClasses('primary')} border-2 border-border rounded-xl p-4 ${getGradientClasses('hover')} transition-all duration-300 shadow-2xl transform hover:scale-105`}>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                          <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                          <div className="relative flex justify-between items-center">
                            <button
                              onClick={() => handleSeasonSelect(season.id)}
                              className="text-left flex-grow text-primary-foreground font-rajdhani font-semibold uppercase tracking-wider"
                            >
                              {season.name}
                            </button>
                          </div>
                          <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {selectedSeason && !selectedCategory && (
                <>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleBack}
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
                      Temporada: {seasons.find(s => s.id === selectedSeason)?.name}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCategories.map((category) => (
                      <CategoryCard
                        key={category.id}
                        id={category.id}
                        name={category.name}
                        onAddPlayer={() => {}}
                        onAddMatch={() => {}}
                        onShowPlayers={() => setSelectedCategory(category.id)}
                        hideActions={true}
                      />
                    ))}
                  </div>
                </>
              )}

              {selectedCategory && (
                <div className="mt-8">
                  <button
                    onClick={handleBack}
                    className="mb-6 flex items-center text-sm text-gray-600 hover:text-gray-900"
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

                  <h2 className="text-2xl font-bold mb-6">
                    {categories.find(c => c.id === selectedCategory)?.name}
                  </h2>

                  <PlayersList 
                    players={categoryPlayers}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    showDownloadButton={true}
                    hideActions={true}
                    dateFilter={{ 
                      startDate: startDate ? new Date(startDate) : undefined, 
                      endDate: endDate ? new Date(endDate) : undefined 
                    }}
                    evaluations={matchStats}
                    filterByCategory={true}
                  />
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}
