import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { CategoryCard } from "@/components/dashboard/CategoryCard";
import { RPEScale } from "@/components/medical/RPEScale";
import { WellnessForm } from "@/components/medical/WellnessForm";
import { BodyModel3D } from "@/components/medical/BodyModel3D";
import { InjuryRecordForm } from "@/components/medical/InjuryRecordForm";
import { InjuryRecordsList } from "@/components/medical/InjuryRecordsList";
import { AilmentForm } from "@/components/medical/AilmentForm";
import { AilmentsList } from "@/components/medical/AilmentsList";
import { WellnessResponsesList } from "@/components/medical/WellnessResponsesList";
import { RPEResponsesList } from "@/components/medical/RPEResponsesList";
import { BodyPainResponsesList } from "@/components/medical/BodyPainResponsesList";
import { MedicalDocuments } from "@/components/medical/MedicalDocuments";
import { PsychologicalDocuments } from "@/components/medical/PsychologicalDocuments";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { WellnessBarChart } from "@/components/medical/WellnessBarChart";
import { PlayersList } from "@/components/dashboard/PlayersList";
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WellnessAverageChart } from "@/components/medical/WellnessAverageChart";
import { BodyPainAverageChart } from "@/components/medical/BodyPainAverageChart";
import { BodyPainCountChart } from "@/components/medical/BodyPainCountChart";
import { RPEAverageChart } from "@/components/medical/RPEAverageChart";
import { BarChart3, Activity, TrendingUp, Bandage, FileDown } from "lucide-react";
import html2canvas from "html2canvas";
import { usePermissions } from "@/hooks/use-permissions";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";
import { getOrganizationLogo } from '@/config/organizationLogos';
import { PreloadedImage } from "@/components/ui/preloaded-image";

export default function MedicalStaff() {
  const [activeTab, setActiveTab] = useState("checkin");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const { canView, canEdit } = usePermissions();
  const { getGradientClasses, theme, organizationId } = useOrganizationTheme();
  
  const [checkinState, setCheckinState] = useState({
    selectedSeason: null as string | null,
    selectedCategory: null as string | null,
    selectedPlayer: null as string | null,
    showBodyModel: false,
  });
  
  const [checkoutState, setCheckoutState] = useState({
    selectedSeason: null as string | null,
    selectedCategory: null as string | null,
    selectedPlayer: null as string | null,
  });
  
  const [injuriesState, setInjuriesState] = useState({
    selectedSeason: null as string | null,
    selectedCategory: null as string | null,
    selectedPlayer: null as string | null,
    showNewInjuryForm: false,
  });
  
  const [ailmentsState, setAilmentsState] = useState({
    selectedSeason: null as string | null,
    selectedCategory: null as string | null,
    selectedPlayer: null as string | null,
    showNewAilmentForm: false,
  });

  const [documentsState, setDocumentsState] = useState({
    selectedSeason: null as string | null,
    selectedCategory: null as string | null,
    selectedPlayer: null as string | null,
  });

  const [psychologicalState, setPsychologicalState] = useState({
    selectedSeason: null as string | null,
    selectedCategory: null as string | null,
    selectedPlayer: null as string | null,
  });

  const [showWellnessChart, setShowWellnessChart] = useState(false);
  const [showWellnessList, setShowWellnessList] = useState(false);
  const [showPainChart, setShowPainChart] = useState(false);
  const [showRPEChart, setShowRPEChart] = useState(false);
  const [showInjuredPlayersModal, setShowInjuredPlayersModal] = useState(false);
  const [showAilmentPlayersModal, setShowAilmentPlayersModal] = useState(false);
  const [showWellnessHistoryModal, setShowWellnessHistoryModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState("");
  const [showInjuryModal, setShowInjuryModal] = useState(false);
  const [selectedInjury, setSelectedInjury] = useState("");
  const [showAilmentModal, setShowAilmentModal] = useState(false);
  const [selectedAilment, setSelectedAilment] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ailmentDateFrom, setAilmentDateFrom] = useState("");
  const [ailmentDateTo, setAilmentDateTo] = useState("");
  const [wellnessDateFrom, setWellnessDateFrom] = useState("");
  const [wellnessDateTo, setWellnessDateTo] = useState("");
  const [filteredInjuredPlayers, setFilteredInjuredPlayers] = useState<any[]>([]);
  const [filteredAilmentPlayers, setFilteredAilmentPlayers] = useState<any[]>([]);
  const [filteredWellnessResponses, setFilteredWellnessResponses] = useState<any[]>([]);
  const [sortOrder, setSortOrder] = useState("desc");
  const [ailmentSortOrder, setAilmentSortOrder] = useState("desc");
  const [wellnessSortOrder, setWellnessSortOrder] = useState("asc");
  const [painChartDateFrom, setPainChartDateFrom] = useState("");
  const [painChartDateTo, setPainChartDateTo] = useState("");
  const [painChartSortOrder, setPainChartSortOrder] = useState("desc");
  const [rpeDateFrom, setRpeDateFrom] = useState("");
  const [rpeDateTo, setRpeDateTo] = useState("");
  const [rpeSortOrder, setRpeSortOrder] = useState<'asc' | 'desc'>("asc");
  const location = useLocation();

  const getCurrentState = () => {
    switch (activeTab) {
      case "checkin": return checkinState;
      case "checkout": return checkoutState;
      case "injuries": return injuriesState;
      case "ailments": return ailmentsState;
      case "documents": return documentsState;
      case "psychological": return psychologicalState;
      default: return checkinState;
    }
  };

  // Ensure these are defined before hooks that depend on them
  const selectedSeason = getCurrentState().selectedSeason;
  const selectedCategory = getCurrentState().selectedCategory;
  const selectedPlayer = getCurrentState().selectedPlayer;

  // Aggregated per-player lists
  const { data: bodyPainPlayers = [] } = useQuery({
    queryKey: ["bodyPainPlayers", selectedCategory, painChartDateFrom, painChartDateTo],
    queryFn: async () => {
      if (!selectedCategory) return [] as any[];

      const { data, error } = await supabase
        .from("body_pain_responses")
        .select(`
          created_at,
          pain_level,
          player_id,
          players!inner(
            id,
            name,
            category_id,
            senior_category_id
          )
        `)
        .or(`category_id.eq.${selectedCategory},senior_category_id.eq.${selectedCategory}`, { foreignTable: 'players' })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching body pain players:', error);
        return [];
      }

      // Filter by date range if provided
      const filtered = data.filter((r: any) => {
        if (!painChartDateFrom && !painChartDateTo) return true;
        const d = new Date(r.created_at);
        const from = painChartDateFrom ? new Date(`${painChartDateFrom}T00:00:00`) : null;
        const to = painChartDateTo ? new Date(`${painChartDateTo}T23:59:59`) : null;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });

      // Aggregate by player
      const byPlayer: Record<string, { player: any; total: number; count: number }> = {};
      for (const r of filtered) {
        const id = r.player_id;
        if (!byPlayer[id]) byPlayer[id] = { player: r.players, total: 0, count: 0 };
        byPlayer[id].total += r.pain_level || 0;
        byPlayer[id].count += 1;
      }

      const result = Object.values(byPlayer).map(({ player, total, count }) => ({
        player,
        averagePain: count ? Math.round((total / count) * 100) / 100 : 0,
        totalResponses: count,
      }));

      return result;
    },
    enabled: !!selectedCategory,
  });

  const { data: rpePlayers = [] } = useQuery({
    queryKey: ["rpePlayers", selectedCategory, rpeDateFrom, rpeDateTo],
    queryFn: async () => {
      if (!selectedCategory) return [] as any[];

      // Determine if selectedCategory is senior
      const isSeniorCategory = categories?.some(cat => cat.id === selectedCategory && 'senior_season_id' in cat);

      let query = supabase
        .from('rpe_responses')
        .select(`
          internal_load,
          rpe_score,
          minutes,
          created_at,
          player_id,
          players!inner(
            id,
            name,
            category_id,
            senior_category_id
          )
        `)
        .order('created_at', { ascending: false });

      if (isSeniorCategory) {
        query = query.eq('players.senior_category_id', selectedCategory);
      } else {
        query = query.eq('players.category_id', selectedCategory);
      }

      if (!isSeniorCategory) {
        query = query.not('players.user_id', 'is', null);
      }

      if (rpeDateFrom) query = query.gte('created_at', `${rpeDateFrom}T00:00:00`);
      if (rpeDateTo) query = query.lte('created_at', `${rpeDateTo}T23:59:59`);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching RPE players:', error);
        return [];
      }

      const byPlayer: Record<string, { player: any; total: number; count: number }> = {};
      for (const r of data) {
        const id = r.player_id;
        if (!byPlayer[id]) byPlayer[id] = { player: r.players, total: 0, count: 0 };
        byPlayer[id].total += r.internal_load || 0;
        byPlayer[id].count += 1;
      }

      const result = Object.values(byPlayer).map(({ player, total, count }) => ({
        player,
        averageInternalLoad: count ? Math.round((total / count) * 100) / 100 : 0,
        totalResponses: count,
      }));

      return result;
    },
    enabled: !!selectedCategory,
  });

  const showNewInjuryForm = injuriesState.showNewInjuryForm;
  const showNewAilmentForm = ailmentsState.showNewAilmentForm;
  const showBodyModel = checkinState.showBodyModel;

  const { data: combinedSeasons = [] } = useQuery({
    queryKey: ["combined-seasons"],
    queryFn: async () => {
      // Fetch youth seasons
      const { data: youthData, error: youthError } = await supabase
        .from("seasons")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (youthError) {
        console.error("Error cargando temporadas juveniles:", youthError);
      }
      
      // Fetch senior seasons
      const { data: seniorData, error: seniorError } = await supabase
        .from("senior_seasons")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (seniorError) {
        console.error("Error cargando temporadas senior:", seniorError);
      }
      
      // Combine and mark each season type
      const youthSeasons = (youthData || []).map(season => ({
        ...season,
        type: 'youth',
        displayName: `Fútbol Joven - ${season.name}`
      }));
      
      const seniorSeasons = (seniorData || []).map(season => ({
        ...season,
        type: 'senior',
        displayName: `Primer Equipo - ${season.name}`
      }));
      
      return [...youthSeasons, ...seniorSeasons];
    },
  });
  
  // Keep separate queries for backward compatibility
  const seasons = combinedSeasons.filter(s => s.type === 'youth');
  const seniorSeasons = combinedSeasons.filter(s => s.type === 'senior');

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", selectedSeason],
    queryFn: async () => {
      if (!selectedSeason) return [];

      // Verificar si es una temporada juvenil o senior
      const isYouthSeason = seasons.some(s => s.id === selectedSeason);
      const isSeniorSeason = seniorSeasons.some(s => s.id === selectedSeason);

      if (isYouthSeason) {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .eq("season_id", selectedSeason)
          .order("name");
        
        if (error) {
          console.error("Error cargando categorías:", error);
          return [];
        }
        
        return data;
      } else if (isSeniorSeason) {
        const { data, error } = await supabase
          .from("senior_categories")
          .select("*")
          .eq("senior_season_id", selectedSeason)
          .order("name");
        
        if (error) {
          console.error("Error cargando categorías senior:", error);
          return [];
        }
        
        return data;
      }
      
      return [];
    },
    enabled: !!selectedSeason,
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      
      const isYouthCategory = categories?.some(cat => cat.id === selectedCategory && 'season_id' in cat);
      const isSeniorCategory = categories?.some(cat => cat.id === selectedCategory && 'senior_season_id' in cat);
      
      let query = supabase
        .from("players")
        .select("*");
      
      if (isYouthCategory) {
        query = query.eq("category_id", selectedCategory);
      } else if (isSeniorCategory) {
        query = query.eq("senior_category_id", selectedCategory);
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
    enabled: !!selectedCategory,
  });

  const { data: injuredPlayersData = { count: 0, players: [] } } = useQuery({
    queryKey: ["injuredPlayersCount", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return { count: 0, players: [] };
      
      const isYouthCategory = categories?.some(cat => cat.id === selectedCategory && 'season_id' in cat);
      const isSeniorCategory = categories?.some(cat => cat.id === selectedCategory && 'senior_season_id' in cat);
      
      let query = supabase
        .from("players")
        .select(`
          id,
          name,
          injury_records!inner(
            id,
            injury_description,
            recommended_treatment,
            date,
            is_active
          )
        `)
        .eq("injury_records.is_active", true);
      
      if (isYouthCategory) {
        query = query.eq("category_id", selectedCategory);
      } else if (isSeniorCategory) {
        query = query.eq("senior_category_id", selectedCategory);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error counting injured players:", error);
        return { count: 0, players: [] };
      }
      
      // Get players with their injury details
      const playersWithInjuries = data.map(player => ({
        id: player.id,
        name: player.name,
        injury: player.injury_records[0] // Get the first active injury
      }));
      
      return { count: playersWithInjuries.length, players: playersWithInjuries };
    },
    enabled: !!selectedCategory && activeTab === "injuries",
  });

  const { data: ailmentPlayersData = { count: 0, players: [] } } = useQuery({
    queryKey: ["ailmentPlayersCount", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return { count: 0, players: [] };
      
      const isYouthCategory = categories?.some(cat => cat.id === selectedCategory && 'season_id' in cat);
      const isSeniorCategory = categories?.some(cat => cat.id === selectedCategory && 'senior_season_id' in cat);
      
      let query = supabase
        .from("players")
        .select(`
          id,
          name,
          ailments!inner(
            id,
            player_id,
            date,
            description,
            is_active
          )
        `)
        .eq("ailments.is_active", true);
      
      if (isYouthCategory) {
        query = query.eq("category_id", selectedCategory);
      } else if (isSeniorCategory) {
        query = query.eq("senior_category_id", selectedCategory);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error counting players with ailments:", error);
        return { count: 0, players: [] };
      }
      
      // Get unique players with their most recent active ailment
      const uniquePlayers = data.reduce((acc, player) => {
        if (!acc.find(p => p.id === player.id)) {
          // Sort ailments by date desc and get the most recent one
          const sortedAilments = player.ailments.sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          acc.push({ 
            id: player.id, 
            name: player.name,
            ailment: sortedAilments[0] // Get the most recent ailment
          });
        }
        return acc;
      }, [] as { id: string; name: string; ailment: any }[]);
      
      return { count: uniquePlayers.length, players: uniquePlayers };
    },
    enabled: !!selectedCategory && activeTab === "ailments",
  });

  const injuredPlayersCount = injuredPlayersData.count;
  const ailmentPlayersCount = ailmentPlayersData.count;

  // Query for daily wellness responses
  const { data: dailyWellnessResponses = [] } = useQuery({
    queryKey: ["dailyWellnessResponses", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data, error } = await supabase
        .from("wellness_responses")
        .select(`
          *,
          players!inner(
            id,
            name,
            category_id,
            senior_category_id
          )
        `)
        .or(`category_id.eq.${selectedCategory},senior_category_id.eq.${selectedCategory}`, { foreignTable: 'players' })
        .gte("created_at", yesterday.toISOString())
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching daily wellness responses:", error);
        return [];
      }
      
      // Group by player and calculate averages
      const playerResponses = data.reduce((acc, response) => {
        const playerId = response.player_id;
        if (!acc[playerId]) {
          acc[playerId] = {
            player: response.players,
            responses: []
          };
        }
        acc[playerId].responses.push(response);
        return acc;
      }, {} as Record<string, { player: any; responses: any[] }>);
      
      // Calculate averages and create sorted list
      const playersWithAverages = Object.values(playerResponses).map(({ player, responses }) => {
        const latestResponse = responses[0]; // Most recent response
        const average = (
          (latestResponse.fatigue_level || 0) +
          (latestResponse.sleep_quality || 0) +
          (latestResponse.muscle_soreness || 0) +
          (latestResponse.stress_level || 0)
        ) / 4;
        
        return {
          player,
          average: Math.round(average * 100) / 100,
          latestResponse
        };
      });
      
      // Sort by average (lowest first)
      return playersWithAverages.sort((a, b) => a.average - b.average);
    },
    enabled: !!selectedCategory && activeTab === "checkin",
  });

  // Query for historical wellness responses
  const { data: historicalWellnessResponses = [] } = useQuery({
    queryKey: ["historicalWellnessResponses", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      
      const { data, error } = await supabase
        .from("wellness_responses")
        .select(`
          *,
          players!inner(
            id,
            name,
            category_id,
            senior_category_id
          )
        `)
        .or(`category_id.eq.${selectedCategory},senior_category_id.eq.${selectedCategory}`, { foreignTable: 'players' })
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching historical wellness responses:", error);
        return [];
      }
      
      console.log("Datos de wellness obtenidos:", data);
      
      // Group by player and calculate averages for all responses
      const playerResponses = data.reduce((acc, response) => {
        const playerId = response.player_id;
        if (!acc[playerId]) {
          acc[playerId] = {
            player: response.players,
            responses: []
          };
        }
        acc[playerId].responses.push(response);
        return acc;
      }, {} as Record<string, { player: any; responses: any[] }>);
      
      // Calculate overall averages for each player
      const playersWithAverages = Object.values(playerResponses).map(({ player, responses }) => {
        // Calculate average across all responses
        const totalResponses = responses.length;
        const sumAverages = responses.reduce((sum, response) => {
          const responseAverage = (
            (response.fatigue_level || 0) +
            (response.sleep_quality || 0) +
            (response.muscle_soreness || 0) +
            (response.stress_level || 0)
          ) / 4;
          return sum + responseAverage;
        }, 0);
        
        const overallAverage = totalResponses > 0 ? sumAverages / totalResponses : 0;
        
        return {
          player,
          average: Math.round(overallAverage * 100) / 100,
          totalResponses,
          responses // Agregar las respuestas aquí para que estén disponibles
        };
      });
      
      // Sort by average (lowest first for priority attention)
      return playersWithAverages.sort((a, b) => a.average - b.average);
    },
    enabled: !!selectedCategory && activeTab === "checkin", // Cambiar la condición para que siempre se ejecute
  });

  // Filter injured players by date range
  const handleDateFilter = () => {
    let filtered = injuredPlayersData.players;
    
    if (dateFrom && dateTo) {
      const fromDate = new Date(`${dateFrom}T00:00:00`);
      const toDate = new Date(`${dateTo}T23:59:59`);
      
      filtered = injuredPlayersData.players.filter((player: any) => {
        if (!player.injury?.date) return false;
        const injuryDate = new Date(player.injury.date);
        return injuryDate >= fromDate && injuryDate <= toDate;
      });
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.injury?.date || 0);
      const dateB = new Date(b.injury?.date || 0);
      
      if (sortOrder === "desc") {
        return dateB.getTime() - dateA.getTime(); // Más reciente primero
      } else {
        return dateA.getTime() - dateB.getTime(); // Más antiguo primero
      }
    });
    
    setFilteredInjuredPlayers(sorted);
  };

  // Clear date filters
  const handleClearFilter = () => {
    setDateFrom("");
    setDateTo("");
    // Apply sorting to all players
    const sorted = [...injuredPlayersData.players].sort((a, b) => {
      const dateA = new Date(a.injury?.date || 0);
      const dateB = new Date(b.injury?.date || 0);
      
      if (sortOrder === "desc") {
        return dateB.getTime() - dateA.getTime();
      } else {
        return dateA.getTime() - dateB.getTime();
      }
    });
    setFilteredInjuredPlayers(sorted);
  };

  // Handle sort order change
  const handleSortChange = (newSortOrder: string) => {
    setSortOrder(newSortOrder);
    // Re-apply current filters with new sort order
    handleDateFilter();
  };

  // Filter ailment players by date range
  const handleAilmentDateFilter = () => {
    let filtered = ailmentPlayersData.players;
    
    if (ailmentDateFrom && ailmentDateTo) {
      const fromDate = new Date(`${ailmentDateFrom}T00:00:00`);
      const toDate = new Date(`${ailmentDateTo}T23:59:59`);
      
      filtered = ailmentPlayersData.players.filter((player: any) => {
        if (!player.ailment?.date) return false;
        const ailmentDate = new Date(player.ailment.date);
        return ailmentDate >= fromDate && ailmentDate <= toDate;
      });
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.ailment?.date || 0);
      const dateB = new Date(b.ailment?.date || 0);
      
      if (ailmentSortOrder === "desc") {
        return dateB.getTime() - dateA.getTime();
      } else {
        return dateA.getTime() - dateB.getTime();
      }
    });
    setFilteredAilmentPlayers(sorted);
  };

  const handleAilmentClearFilter = () => {
    setAilmentDateFrom("");
    setAilmentDateTo("");
    // Re-initialize with all players sorted
    const sorted = [...ailmentPlayersData.players].sort((a, b) => {
      const dateA = new Date(a.ailment?.date || 0);
      const dateB = new Date(b.ailment?.date || 0);
      
      if (ailmentSortOrder === "desc") {
        return dateB.getTime() - dateA.getTime();
      } else {
        return dateA.getTime() - dateB.getTime();
      }
    });
    setFilteredAilmentPlayers(sorted);
  };

  // Handle ailment sort order change
  const handleAilmentSortChange = (newSortOrder: string) => {
    setAilmentSortOrder(newSortOrder);
    // Re-apply current filters with new sort order
    handleAilmentDateFilter();
  };

  // Pain Chart filter functions
  const handlePainChartDateFilter = () => {
    // This will trigger chart updates through the date props
  };

  const handlePainChartClearFilter = () => {
    setPainChartDateFrom("");
    setPainChartDateTo("");
  };

  const handlePainChartSortChange = (newSortOrder: string) => {
    setPainChartSortOrder(newSortOrder);
  };

  // Wellness filter functions
  const handleWellnessDateFilter = () => {
    if (!historicalWellnessResponses || historicalWellnessResponses.length === 0) return;
    
    let filtered = [...historicalWellnessResponses];
    
    if (wellnessDateFrom && wellnessDateTo) {
      const fromDate = new Date(`${wellnessDateFrom}T00:00:00`);
      const toDate = new Date(`${wellnessDateTo}T23:59:59`);
      
      // Filter based on the player's responses within the date range
      filtered = historicalWellnessResponses.map((playerData: any) => {
        // Filter the responses within the date range
        const filteredResponses = playerData.responses?.filter((response: any) => {
          if (!response.created_at) return false;
          const responseDate = new Date(response.created_at);
          return responseDate >= fromDate && responseDate <= toDate;
        }) || [];
        
        if (filteredResponses.length === 0) return null;
        
        // Recalculate average for the filtered responses
        const totalSum = filteredResponses.reduce((sum: number, response: any) => {
          return sum + (response.sleep_quality || 0) + (response.fatigue_level || 0) + 
                 (response.stress_level || 0) + (response.motivation_level || 0);
        }, 0);
        const totalQuestions = filteredResponses.length * 4;
        const newAverage = totalQuestions > 0 ? totalSum / totalQuestions : 0;
        
        return {
          ...playerData,
          responses: filteredResponses,
          average: newAverage,
          totalResponses: filteredResponses.length
        };
      }).filter(Boolean);
      
      // Apply current sort order
      filtered.sort((a: any, b: any) => {
        if (wellnessSortOrder === "asc") {
          return a.average - b.average;
        } else {
          return b.average - a.average;
        }
      });
    }
    
    setFilteredWellnessResponses(filtered);
  };

  const handleWellnessClearFilter = () => {
    setWellnessDateFrom("");
    setWellnessDateTo("");
    setFilteredWellnessResponses([]);
  };

  const handleWellnessSortChange = (newSortOrder: string) => {
    setWellnessSortOrder(newSortOrder);
    
    // Apply sorting to current data
    const dataToSort = filteredWellnessResponses.length > 0 ? filteredWellnessResponses : historicalWellnessResponses;
    if (dataToSort.length > 0) {
      const sorted = [...dataToSort].sort((a: any, b: any) => {
        if (newSortOrder === "asc") {
          return a.average - b.average; // Menor a mayor promedio
        } else {
          return b.average - a.average; // Mayor a menor promedio
        }
      });
      
      if (filteredWellnessResponses.length > 0) {
        setFilteredWellnessResponses(sorted);
      }
    }
  };

  // Initialize filtered players when data changes
  useEffect(() => {
    if (injuredPlayersData.players.length > 0) {
      const sorted = [...injuredPlayersData.players].sort((a, b) => {
        const dateA = new Date(a.injury?.date || 0);
        const dateB = new Date(b.injury?.date || 0);
        
        if (sortOrder === "desc") {
          return dateB.getTime() - dateA.getTime();
        } else {
          return dateA.getTime() - dateB.getTime();
        }
      });
      setFilteredInjuredPlayers(sorted);
    }
  }, [injuredPlayersData.count, sortOrder]);

  // Initialize filtered ailment players when data changes
  useEffect(() => {
    if (ailmentPlayersData.players.length > 0) {
      const sorted = [...ailmentPlayersData.players].sort((a, b) => {
        const dateA = new Date(a.ailment?.date || 0);
        const dateB = new Date(b.ailment?.date || 0);
        
        if (ailmentSortOrder === "desc") {
          return dateB.getTime() - dateA.getTime();
        } else {
          return dateA.getTime() - dateB.getTime();
        }
      });
      setFilteredAilmentPlayers(sorted);
    }
  }, [ailmentPlayersData.count, ailmentSortOrder]);

  const updateState = (updates: Partial<typeof checkinState>) => {
    switch (activeTab) {
      case "checkin":
        setCheckinState({ ...checkinState, ...updates });
        break;
      case "checkout":
        setCheckoutState({ ...checkoutState, ...updates });
        break;
      case "injuries":
        setInjuriesState({ ...injuriesState, ...updates });
        break;
      case "ailments":
        setAilmentsState({ ...ailmentsState, ...updates });
        break;
      case "documents":
        setDocumentsState({ ...documentsState, ...updates });
        break;
      case "psychological":
        setPsychologicalState({ ...psychologicalState, ...updates });
        break;
    }
  };

  const handleSeasonSelect = (seasonId: string) => {
    updateState({ 
      selectedSeason: seasonId,
      selectedCategory: null,
      selectedPlayer: null,
    });
    
    if (activeTab === "checkin") {
      setCheckinState(prev => ({ ...prev, showBodyModel: false }));
    }
  };

  const handleShowPlayers = (categoryId: string) => {
    updateState({
      selectedCategory: categoryId,
      selectedPlayer: null,
    });
    
    if (activeTab === "checkin") {
      setCheckinState(prev => ({ ...prev, showBodyModel: false }));
    }
  };

  const handleRPESubmit = (rpe: number, minutes: number, internalLoad: number) => {
    toast({
      title: "Carga interna calculada",
      description: `RPE: ${rpe}, Minutos: ${minutes}, Carga interna: ${internalLoad}`,
    });
  };

  const handlePlayerSelect = (playerId: string) => {
    updateState({ selectedPlayer: playerId });
    
    if (activeTab === "checkin") {
      setCheckinState(prev => ({ ...prev, showBodyModel: false }));
    }
  };

  const handleWellnessSubmit = () => {
    setCheckinState(prev => ({ ...prev, showBodyModel: true }));
  };

  const handleBodyModelSubmit = () => {
    setCheckinState({
      showBodyModel: false,
      selectedPlayer: null,
      selectedCategory: null,
      selectedSeason: null,
    });
  };

  const handleInjuryRecordSubmit = () => {
    setInjuriesState(prev => ({ ...prev, showNewInjuryForm: false }));
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleDownloadInjuredPlayersReport = async () => {
    try {
      if (!selectedCategory) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No hay categoría seleccionada",
        });
        return;
      }

      if (!filteredInjuredPlayers || filteredInjuredPlayers.length === 0) {
        toast({
          variant: "destructive",
          title: "Sin datos",
          description: "No hay jugadores lesionados para descargar",
        });
        return;
      }

      // Preparar los datos para el Excel usando los jugadores filtrados
      const excelData = filteredInjuredPlayers.map((player: any) => ({
        'Nombre': player.name || 'N/A',
        'Descripción de la Lesión': player.injury?.injury_description || 'N/A',
        'Tratamiento Recomendado': player.injury?.recommended_treatment || 'N/A',
        'Fecha de Lesión': player.injury?.date 
          ? new Date(player.injury.date).toLocaleDateString('es-ES')
          : 'N/A',
        'Estado': player.injury?.is_active ? 'Activa' : 'Inactiva'
      }));

      // Crear el workbook y worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Ajustar el ancho de las columnas
      const columnWidths = [
        { wch: 25 }, // Nombre
        { wch: 40 }, // Descripción de la Lesión
        { wch: 40 }, // Tratamiento Recomendado
        { wch: 15 }, // Fecha de Lesión
        { wch: 12 }  // Estado
      ];
      worksheet['!cols'] = columnWidths;

      // Agregar el worksheet al workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Jugadores Lesionados');

      // Generar el nombre del archivo con fecha actual
      const now = new Date();
      const dateString = now.toISOString().split('T')[0];
      const fileName = `resumen_jugadores_lesionados_${dateString}.xlsx`;

      // Descargar el archivo
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Excel generado",
        description: `Se ha descargado el archivo ${fileName}`,
      });
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al generar el archivo Excel",
      });
    }
  };

  const handleDownloadWellnessPlayersReport = async () => {
    try {
      if (!selectedCategory) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No hay categoría seleccionada",
        });
        return;
      }

      if (!historicalWellnessResponses || historicalWellnessResponses.length === 0) {
        toast({
          variant: "destructive",
          title: "Sin datos",  
          description: "No hay datos de wellness para descargar",
        });
        return;
      }

      // Obtener datos filtrados
      let dataToExport = [...historicalWellnessResponses];
      
      if (wellnessDateFrom && wellnessDateTo) {
        const fromDate = new Date(`${wellnessDateFrom}T00:00:00`);
        const toDate = new Date(`${wellnessDateTo}T23:59:59`);
        
        dataToExport = historicalWellnessResponses.map((playerData: any) => {
          const filteredResponses = playerData.responses?.filter((response: any) => {
            if (!response.created_at) return false;
            const responseDate = new Date(response.created_at);
            return responseDate >= fromDate && responseDate <= toDate;
          }) || [];
          
          if (filteredResponses.length === 0) return null;
          
          // Recalcular promedio para respuestas filtradas
          const totalSum = filteredResponses.reduce((sum: number, response: any) => {
            return sum + (response.sleep_quality || 0) + (response.fatigue_level || 0) + 
                   (response.stress_level || 0) + (response.muscle_soreness || 0);
          }, 0);
          const totalQuestions = filteredResponses.length * 4;
          const newAverage = totalQuestions > 0 ? totalSum / totalQuestions : 0;
          
          return {
            ...playerData,
            responses: filteredResponses,
            average: Math.round(newAverage * 100) / 100,
            totalResponses: filteredResponses.length
          };
        }).filter(Boolean);
      }

      // Capturar imagen del gráfico
      let chartImage = null;
      try {
        const chartElement = document.getElementById('wellness-chart');
        if (chartElement) {
          const canvas = await html2canvas(chartElement, {
            backgroundColor: '#ffffff',
            scale: 2
          });
          chartImage = canvas.toDataURL('image/png');
        }
      } catch (error) {
        console.warn('Error capturing chart:', error);
      }

      // Preparar los datos para el Excel (corrigiendo el orden de columnas)
      const excelData = dataToExport.map((player: any) => ({
        'Nombre': player.player?.name || player.name || 'N/A',
        'Promedio General': player.average || 0,
        'Total de Respuestas': player.totalResponses || player.responses?.length || 0,
        'Calidad de Sueño Promedio': player.responses && player.responses.length > 0 
          ? Math.round((player.responses.reduce((sum: number, r: any) => sum + (r.sleep_quality || 0), 0) / player.responses.length) * 100) / 100
          : 0,
        'Nivel de Fatiga Promedio': player.responses && player.responses.length > 0
          ? Math.round((player.responses.reduce((sum: number, r: any) => sum + (r.fatigue_level || 0), 0) / player.responses.length) * 100) / 100
          : 0,
        'Dolor Muscular Promedio': player.responses && player.responses.length > 0
          ? Math.round((player.responses.reduce((sum: number, r: any) => sum + (r.muscle_soreness || 0), 0) / player.responses.length) * 100) / 100
          : 0,
        'Nivel de Estrés Promedio': player.responses && player.responses.length > 0
          ? Math.round((player.responses.reduce((sum: number, r: any) => sum + (r.stress_level || 0), 0) / player.responses.length) * 100) / 100
          : 0,
        'Estado': player.average >= 7 ? 'Excelente' : player.average >= 5 ? 'Bueno' : player.average >= 3 ? 'Regular' : 'Crítico'
      }));

      // Crear el workbook con ExcelJS
      const workbook = new ExcelJS.Workbook();
      
      // Crear worksheet con datos
      const worksheet = workbook.addWorksheet('Datos Wellness');
      
      // Agregar headers
      const headers = [
        'Nombre',
        'Promedio General', 
        'Total de Respuestas',
        'Calidad de Sueño Promedio',
        'Nivel de Fatiga Promedio',
        'Dolor Muscular Promedio',
        'Nivel de Estrés Promedio',
        'Estado'
      ];
      
      worksheet.addRow(headers);
      
      // Agregar datos
      excelData.forEach((player: any) => {
        worksheet.addRow([
          player['Nombre'],
          player['Promedio General'],
          player['Total de Respuestas'],
          player['Calidad de Sueño Promedio'],
          player['Nivel de Fatiga Promedio'],
          player['Dolor Muscular Promedio'],
          player['Nivel de Estrés Promedio'],
          player['Estado']
        ]);
      });

      // Ajustar el ancho de las columnas
      worksheet.columns = [
        { width: 25 }, // Nombre
        { width: 18 }, // Promedio General
        { width: 20 }, // Total de Respuestas
        { width: 25 }, // Calidad de Sueño Promedio
        { width: 25 }, // Nivel de Fatiga Promedio
        { width: 25 }, // Dolor Muscular Promedio
        { width: 25 }, // Nivel de Estrés Promedio
        { width: 15 }  // Estado
      ];

      // Si hay imagen del gráfico, agregar una segunda hoja con la imagen
      if (chartImage) {
        const chartSheet = workbook.addWorksheet('Gráfico');
        
        // Agregar título
        chartSheet.getCell('A1').value = 'Gráfico de Promedio de Respuestas Wellness';
        chartSheet.getCell('A1').font = { bold: true, size: 14 };
        
        // Convertir base64 a buffer (compatible con navegador)
        const base64Data = chartImage.replace(/^data:image\/png;base64,/, '');
        const binaryString = atob(base64Data);
        const imageBuffer = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          imageBuffer[i] = binaryString.charCodeAt(i);
        }
        
        // Agregar imagen al Excel
        const imageId = workbook.addImage({
          buffer: imageBuffer,
          extension: 'png',
        });
        
        // Insertar imagen en la celda A3
        chartSheet.addImage(imageId, {
          tl: { col: 0, row: 2 }, // Top-left position (column A, row 3)
          ext: { width: 800, height: 400 } // Size of the image
        });
      }

      // Generar el nombre del archivo con fecha actual
      const now = new Date();
      const dateString = now.toISOString().split('T')[0];
      const dateRange = wellnessDateFrom && wellnessDateTo 
        ? `_${wellnessDateFrom}_${wellnessDateTo}`
        : '_historico';
      const fileName = `resumen_wellness_jugadores${dateRange}_${dateString}.xlsx`;

      // Generar el buffer del archivo
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Crear blob y descargar
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Excel generado",
        description: `Se ha descargado el archivo ${fileName}`,
      });
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al generar el archivo Excel",
      });
    }
  };

  const handleDownloadAilmentPlayersReport = async () => {
    try {
      if (!selectedCategory) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No hay categoría seleccionada",
        });
        return;
      }

      if (!filteredAilmentPlayers || filteredAilmentPlayers.length === 0) {
        toast({
          variant: "destructive",
          title: "Sin datos",
          description: "No hay jugadores con malestares para descargar",
        });
        return;
      }

      // Preparar los datos para el Excel usando los jugadores filtrados
      const excelData = filteredAilmentPlayers.map((player: any) => ({
        'Nombre': player.name || 'N/A',
        'Descripción del Malestar': player.ailment?.description || 'N/A',
        'Fecha del Malestar': player.ailment?.date 
          ? new Date(player.ailment.date).toLocaleDateString('es-ES')
          : 'N/A',
        'Estado': player.ailment?.is_active ? 'Activa' : 'Inactiva'
      }));

      // Crear el workbook y worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Ajustar el ancho de las columnas
      const columnWidths = [
        { wch: 25 }, // Nombre
        { wch: 40 }, // Descripción del Malestar
        { wch: 15 }, // Fecha del Malestar
        { wch: 12 }  // Estado
      ];
      worksheet['!cols'] = columnWidths;

      // Agregar el worksheet al workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Jugadores con Malestares');

      // Generar el nombre del archivo con fecha actual
      const now = new Date();
      const dateString = now.toISOString().split('T')[0];
      const fileName = `resumen_jugadores_malestares_${dateString}.xlsx`;

      // Descargar el archivo
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Excel generado",
        description: `Se ha descargado el archivo ${fileName}`,
      });
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al generar el archivo Excel",
      });
    }
  };

  // Resetear al inicio cuando se reciba el parámetro ?home=1
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('home') === '1') {
      setActiveTab('checkin');
      setCheckinState({
        selectedSeason: null,
        selectedCategory: null,
        selectedPlayer: null,
        showBodyModel: false,
      });
      setCheckoutState({
        selectedSeason: null,
        selectedCategory: null,
        selectedPlayer: null,
      });
      setInjuriesState({
        selectedSeason: null,
        selectedCategory: null,
        selectedPlayer: null,
        showNewInjuryForm: false,
      });
      setAilmentsState({
        selectedSeason: null,
        selectedCategory: null,
        selectedPlayer: null,
        showNewAilmentForm: false,
      });
      setDocumentsState({
        selectedSeason: null,
        selectedCategory: null,
        selectedPlayer: null,
      });
      setShowWellnessList(false);
      setShowWellnessChart(false);
      setShowPainChart(false);
      setShowRPEChart(false);
    }
  }, [location.search]);

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
        <h1 className="text-2xl font-bold mb-4 mt-8">Parte Médico Personal</h1>
        
        <div className="flex gap-4 mb-8">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === 'checkin'
                ? 'bg-gradient-to-br ' + getGradientClasses('primary') + ' text-white'
                : 'text-muted-foreground'
            }`}
            onClick={() => handleTabChange('checkin')}
          >
            Check in
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === 'checkout'
                ? 'bg-gradient-to-br ' + getGradientClasses('primary') + ' text-white'
                : 'text-muted-foreground'
            }`}
            onClick={() => handleTabChange('checkout')}
          >
            Check out
          </button>
          {canView('medical_staff') && (
            <button
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'injuries'
                  ? 'bg-gradient-to-br ' + getGradientClasses('primary') + ' text-white'
                  : 'text-muted-foreground'
              }`}
              onClick={() => handleTabChange('injuries')}
            >
              Registro de lesiones
            </button>
          )}
          {canView('medical_staff') && (
            <button
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'ailments'
                  ? 'bg-gradient-to-br ' + getGradientClasses('primary') + ' text-white'
                  : 'text-muted-foreground'
              }`}
              onClick={() => handleTabChange('ailments')}
            >
              Enfermedades o malestares
            </button>
          )}
          {canView('medical_staff') && (
            <button
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'documents'
                  ? 'bg-gradient-to-br ' + getGradientClasses('primary') + ' text-white'
                  : 'text-muted-foreground'
              }`}
              onClick={() => handleTabChange('documents')}
            >
              Exámenes e informes médicos
            </button>
          )}
          {canView('medical_staff') && (
            <button
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'psychological'
                  ? 'bg-gradient-to-br ' + getGradientClasses('primary') + ' text-white'
                  : 'text-muted-foreground'
              }`}
              onClick={() => handleTabChange('psychological')}
            >
              Evaluaciones psicológicas
            </button>
          )}
        </div>

        {!selectedSeason && (
          <div className="bg-white rounded-lg shadow p-6 mt-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Seleccionar Temporada</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {combinedSeasons.map((season) => (
                <div 
                  key={season.id} 
                  className={`relative bg-gradient-to-br ${getGradientClasses('primary')} border-2 border-border rounded-xl p-4 ${getGradientClasses('hover')} transition-all duration-300 shadow-2xl transform hover:scale-105 cursor-pointer`}
                  onClick={() => handleSeasonSelect(season.id)}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                  <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                  <div className="relative flex justify-between items-center">
                    <span className="text-left flex-grow text-primary-foreground font-rajdhani font-semibold uppercase tracking-wider">{season.displayName}</span>
                  </div>
                  <div className={`absolute top-1 right-1 w-2 h-2 ${season.type === 'youth' ? 'bg-yellow-400' : 'bg-green-400'} rounded-full animate-pulse`}></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedSeason && !selectedCategory && (
          <div className="mt-8">
            <button
              onClick={() => updateState({ selectedSeason: null })}
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

            <h2 className="text-xl font-semibold mb-4">Seleccionar Categoría</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  id={category.id}
                  name={category.name}
                  onAddPlayer={() => {}}
                  onAddMatch={() => {}}
                  onShowPlayers={() => handleShowPlayers(category.id)}
                  hideActions={true}
                />
              ))}
            </div>
          </div>
        )}

        {selectedSeason && selectedCategory && activeTab === "checkin" && !selectedPlayer && (
          <div className="mt-8">
            <button
              onClick={() => updateState({ selectedCategory: null })}
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

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Seleccionar Jugador</h2>
                <div className="flex gap-2">
                   <div className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2 transition-all duration-300 cursor-pointer shadow-2xl transform hover:scale-105`}
                     onClick={() => setShowWellnessHistoryModal(true)}
                   >
                     <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                     <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                     <div className="relative flex items-center gap-2 text-center">
                       <BarChart3 className="h-4 w-4 text-primary-foreground" />
                       <p className="text-sm font-rajdhani font-semibold text-primary-foreground uppercase tracking-wider">Formulario Wellness</p>
                     </div>
                   </div>
                  <div className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2 transition-all duration-300 cursor-pointer shadow-2xl transform hover:scale-105`}
                    onClick={() => setShowPainChart(true)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                    <div className="relative flex items-center gap-2 text-center">
                      <Activity className="h-4 w-4 text-primary-foreground" />
                      <p className="text-sm font-rajdhani font-semibold text-primary-foreground uppercase tracking-wider">Molestia Muscular</p>
                    </div>
                  </div>
                </div>
              </div>
              <PlayersList 
                players={players} 
                onEdit={() => {}} 
                onDelete={() => {}}
                onTransfer={() => {}}
                showDownloadButton={false}
                onEditCoach={() => {}}
                onDeleteCoach={() => {}}
                coaches={[]}
                onPlayerSelect={handlePlayerSelect}
              />
              {showWellnessList && (
                <div className="py-4 bg-white rounded-lg shadow p-6 mt-4">
                  {dailyWellnessResponses.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Jugadores ordenados por promedio de respuestas (últimas 24 horas)
                      </h3>
                      {dailyWellnessResponses.map((playerData) => {
                        const { player, average } = playerData;
                        let bgColor = "";
                        let textColor = "text-white";
                        
                        if (average >= 1 && average <= 3) {
                          bgColor = "bg-red-500";
                        } else if (average >= 4 && average <= 7) {
                          bgColor = "bg-yellow-500";
                          textColor = "text-gray-800";
                        } else if (average >= 8 && average <= 10) {
                          bgColor = "bg-green-500";
                        }
                        
                        return (
                          <div
                            key={player.id}
                            className={`${bgColor} ${textColor} p-4 rounded-lg flex justify-between items-center`}
                          >
                            <div>
                              <h4 className="font-semibold">{player.name}</h4>
                              <p className="text-sm opacity-90">
                                Promedio: {average}/10
                              </p>
                            </div>
                            <div className="text-right text-sm opacity-90">
                              <div>Fatiga: {playerData.latestResponse.fatigue_level || 'N/A'}</div>
                              <div>Sueño: {playerData.latestResponse.sleep_quality || 'N/A'}</div>
                              <div>Dolor muscular: {playerData.latestResponse.muscle_soreness || 'N/A'}</div>
                              <div>Estrés: {playerData.latestResponse.stress_level || 'N/A'}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Aún no se han registrado respuestas</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedSeason && selectedCategory && activeTab === "checkin" && selectedPlayer && (
          <div className="mt-8">
            <button
              onClick={() => updateState({ selectedPlayer: null })}
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

            <Tabs defaultValue="wellness" className="space-y-8">
              <TabsList>
                <TabsTrigger value="wellness">Formulario Wellness</TabsTrigger>
                <TabsTrigger value="muscular">Molestia Muscular</TabsTrigger>
              </TabsList>

              <TabsContent value="wellness" className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Respuestas Wellness del Jugador</h2>
                <WellnessResponsesList playerId={selectedPlayer} />
              </TabsContent>

              <TabsContent value="muscular" className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Respuestas de Dolor Corporal</h2>
                <BodyPainResponsesList playerId={selectedPlayer} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {selectedSeason && selectedCategory && activeTab === "checkout" && !selectedPlayer && (
          <div className="mt-8">
            <button
              onClick={() => updateState({ selectedCategory: null })}
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

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Seleccionar Jugador</h2>
                <div className="flex gap-2">
                  <div className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2 transition-all duration-300 cursor-pointer shadow-2xl transform hover:scale-105`}
                    onClick={() => setShowRPEChart(true)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                    <div className="relative flex items-center gap-2 text-center">
                      <TrendingUp className="h-4 w-4 text-primary-foreground" />
                      <p className="text-sm font-rajdhani font-semibold text-primary-foreground uppercase tracking-wider">Carga Interna</p>
                    </div>
                  </div>
                </div>
              </div>
              <PlayersList 
                players={players} 
                onEdit={() => {}} 
                onDelete={() => {}}
                onTransfer={() => {}}
                showDownloadButton={false}
                onEditCoach={() => {}}
                onDeleteCoach={() => {}}
                coaches={[]}
                onPlayerSelect={handlePlayerSelect}
              />
            </div>
          </div>
        )}

        {selectedSeason && selectedCategory && activeTab === "checkout" && selectedPlayer && (
          <div className="mt-8">
            <button
              onClick={() => updateState({ selectedPlayer: null })}
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

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Respuestas RPE del Jugador</h2>
              <RPEResponsesList playerId={selectedPlayer} />
            </div>
          </div>
        )}

        {selectedSeason && selectedCategory && activeTab === "injuries" && !selectedPlayer && canView("medical_staff") && (
          <div className="mt-8">
            <button
              onClick={() => updateState({ selectedCategory: null })}
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

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-center mb-6">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-4 transition-all duration-300 cursor-pointer shadow-2xl w-44 h-32 transform hover:scale-105`}
                        onClick={() => setShowInjuredPlayersModal(true)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                        <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                        <div className="relative flex flex-col items-center justify-center h-full text-center">
                          <div className="space-y-1">
                            <p className="text-xs font-rajdhani font-semibold text-primary-foreground uppercase tracking-wider">Jugadores</p>
                            <p className="text-xs font-rajdhani font-semibold text-primary-foreground uppercase tracking-wider">Lesionados</p>
                            <div className="bg-white/20 rounded-lg px-3 py-1 mt-2 backdrop-blur-sm border border-white/30">
                              <p className="text-2xl font-orbitron font-black text-primary-foreground drop-shadow-lg">{injuredPlayersCount}</p>
                            </div>
                          </div>
                        </div>
                        <div className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs">
                        <p className="font-semibold mb-2">Jugadores con lesiones activas:</p>
                        {injuredPlayersData.players.map((player) => (
                          <p key={player.id} className="text-sm">• {player.name}</p>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <h2 className="text-xl font-semibold mb-4">Seleccionar Jugador</h2>
              <PlayersList 
                players={players} 
                onEdit={() => {}} 
                onDelete={() => {}}
                onTransfer={() => {}}
                showDownloadButton={false}
                onEditCoach={() => {}}
                onDeleteCoach={() => {}}
                coaches={[]}
                onPlayerSelect={handlePlayerSelect}
              />
            </div>
          </div>
        )}

        {selectedSeason && selectedCategory && activeTab === "injuries" && selectedPlayer && (
          <div className="mt-8">
            <button
              onClick={() => updateState({ selectedPlayer: null })}
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

            <div className="space-y-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Registros de lesiones</h2>
                  {canEdit("medical_staff") && (
                    <Button 
                      onClick={() => setInjuriesState(prev => ({ ...prev, showNewInjuryForm: true }))}
                    >
                      Agregar registro
                    </Button>
                  )}
                </div>
                <InjuryRecordsList playerId={selectedPlayer} />
              </div>
            </div>

            <Dialog 
              open={showNewInjuryForm} 
              onOpenChange={(open) => setInjuriesState(prev => ({ ...prev, showNewInjuryForm: open }))}
            >
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Nuevo registro de lesión</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <InjuryRecordForm 
                    playerId={selectedPlayer} 
                    onSubmit={handleInjuryRecordSubmit}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {selectedSeason && selectedCategory && activeTab === "ailments" && !selectedPlayer && canView("medical_staff") && (
          <div className="mt-8">
            <button
              onClick={() => updateState({ selectedCategory: null })}
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

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Seleccionar Jugador</h2>
                <div className="flex justify-center w-full">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-4 transition-all duration-300 cursor-pointer shadow-2xl w-44 h-32 transform hover:scale-105`}
                          onClick={() => setShowAilmentPlayersModal(true)}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                          <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                          <div className="relative flex flex-col items-center justify-center h-full text-center">
                            <div className="space-y-1">
                              <p className="text-xs font-rajdhani font-semibold text-primary-foreground uppercase tracking-wider">Jugadores con</p>
                              <p className="text-xs font-rajdhani font-semibold text-primary-foreground uppercase tracking-wider">Malestares</p>
                              <div className="bg-white/20 rounded-lg px-3 py-1 mt-2 backdrop-blur-sm border border-white/30">
                                <p className="text-2xl font-orbitron font-black text-primary-foreground drop-shadow-lg">{ailmentPlayersCount}</p>
                              </div>
                            </div>
                          </div>
                          <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs">
                          <p className="font-semibold mb-2">Jugadores con malestares activos:</p>
                          {ailmentPlayersData.players.map((player) => (
                            <p key={player.id} className="text-sm">• {player.name}</p>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <PlayersList 
                players={players} 
                onEdit={() => {}} 
                onDelete={() => {}}
                onTransfer={() => {}}
                showDownloadButton={false}
                onEditCoach={() => {}}
                onDeleteCoach={() => {}}
                coaches={[]}
                onPlayerSelect={handlePlayerSelect}
              />
            </div>
          </div>
        )}

        {selectedSeason && selectedCategory && activeTab === "ailments" && selectedPlayer && canView("medical_staff") && (
          <div className="mt-8">
            <button
              onClick={() => updateState({ selectedPlayer: null })}
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

            <div className="space-y-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Registro de enfermedades o malestares</h2>
                  {canEdit("medical_staff") && (
                    <Button 
                      onClick={() => setAilmentsState(prev => ({ ...prev, showNewAilmentForm: true }))}
                    >
                      Agregar registro
                    </Button>
                  )}
                </div>
                <AilmentsList playerId={selectedPlayer} />
              </div>
            </div>

            <Dialog
              open={showNewAilmentForm}
              onOpenChange={(open) => setAilmentsState(prev => ({ ...prev, showNewAilmentForm: open }))}
            >
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Nuevo registro de dolencia</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <AilmentForm
                    playerId={selectedPlayer}
                    onSubmit={() => setAilmentsState(prev => ({ ...prev, showNewAilmentForm: false }))}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {selectedSeason && selectedCategory && activeTab === "documents" && !selectedPlayer && canView("medical_staff") && (
          <div className="mt-8">
            <button
              onClick={() => updateState({ selectedCategory: null })}
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

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Seleccionar Jugador</h2>
                
              </div>
              <PlayersList 
                players={players} 
                onEdit={() => {}} 
                onDelete={() => {}}
                onTransfer={() => {}}
                showDownloadButton={false}
                onEditCoach={() => {}}
                onDeleteCoach={() => {}}
                coaches={[]}
                onPlayerSelect={handlePlayerSelect}
              />
            </div>
          </div>
        )}

        {selectedSeason && selectedCategory && activeTab === "documents" && selectedPlayer && canView("medical_staff") && (
          <div className="mt-8">
            <button
              onClick={() => updateState({ selectedPlayer: null })}
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

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Exámenes e informes médicos</h2>
              <MedicalDocuments playerId={selectedPlayer} />
            </div>
            {/* Sección psicológica removida de aquí: se moverá a su propia pestaña */}
          </div>
        )}

        {selectedSeason && selectedCategory && activeTab === "psychological" && !selectedPlayer && canView("medical_staff") && (
          <div className="mt-8">
            <button
              onClick={() => updateState({ selectedCategory: null })}
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

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Seleccionar Jugador</h2>
              </div>
              <PlayersList 
                players={players} 
                onEdit={() => {}} 
                onDelete={() => {}}
                onTransfer={() => {}}
                showDownloadButton={false}
                onEditCoach={() => {}}
                onDeleteCoach={() => {}}
                coaches={[]}
                onPlayerSelect={handlePlayerSelect}
              />
            </div>
          </div>
        )}

        {selectedSeason && selectedCategory && activeTab === "psychological" && selectedPlayer && canView("medical_staff") && (
          <div className="mt-8">
            <button
              onClick={() => updateState({ selectedPlayer: null })}
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

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Evaluaciones psicológicas</h2>
              <PsychologicalDocuments playerId={selectedPlayer} />
            </div>
          </div>
        )}

        {/* Wellness Chart Dialog */}
        <Dialog open={showWellnessChart} onOpenChange={setShowWellnessChart}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Promedios de Formulario Wellness por Categoría</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {selectedCategory && <WellnessAverageChart categoryId={selectedCategory} />}
            </div>
          </DialogContent>
        </Dialog>

        {/* Body Pain Chart Dialog */}
        <Dialog open={showPainChart} onOpenChange={setShowPainChart}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Promedios de Dolor Muscular por Categoría</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {/* Filtros de fecha y ordenamiento */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtros</h3>
                <div className="flex items-center gap-2 md:gap-4 flex-wrap md:flex-nowrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Desde:</label>
                    <input
                      type="date"
                      value={painChartDateFrom}
                      onChange={(e) => setPainChartDateFrom(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Hasta:</label>
                    <input
                      type="date"
                      value={painChartDateTo}
                      onChange={(e) => setPainChartDateTo(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <Button 
                    onClick={handlePainChartDateFilter}
                    className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                        Buscar
                      </span>
                    </div>
                  </Button>
                  <Button 
                    onClick={handlePainChartClearFilter}
                    variant="outline"
                    className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                        Limpiar
                      </span>
                    </div>
                  </Button>
                  <div className="flex items-center gap-2 md:ml-4 ml-0 whitespace-nowrap">
                    <label className="text-sm text-gray-600">Ordenar:</label>
                    <select 
                      value={painChartSortOrder}
                      onChange={(e) => handlePainChartSortChange(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="desc">Más reciente a más antiguo</option>
                      <option value="asc">Más antiguo a más reciente</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="space-y-8">
                {selectedCategory && (
                  <BodyPainAverageChart 
                    categoryId={selectedCategory} 
                    dateFrom={painChartDateFrom}
                    dateTo={painChartDateTo}
                  />
                )}
                {selectedCategory && (
                  <BodyPainCountChart 
                    categoryId={selectedCategory}
                    dateFrom={painChartDateFrom}
                    dateTo={painChartDateTo}
                  />
                )}
              </div>
              {/* Lista de jugadores - Molestia Muscular (estilo Wellness, sin colores) */}
              <div className="mt-8">
                {([...bodyPainPlayers]
                  .sort((a: any, b: any) => painChartSortOrder === 'asc' ? a.averagePain - b.averagePain : b.averagePain - a.averagePain)
                ).length > 0 ? (
                  <div className="space-y-3">
                    {([...bodyPainPlayers]
                      .sort((a: any, b: any) => painChartSortOrder === 'asc' ? a.averagePain - b.averagePain : b.averagePain - a.averagePain)
                    ).map((item: any) => (
                      <div
                        key={item.player.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center shadow-sm"
                      >
                        <div>
                          <h4 className="font-semibold text-base text-gray-900">{item.player.name}</h4>
                          <p className="text-xs text-gray-500">Total de respuestas: {item.totalResponses}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-700">Promedio dolor</div>
                          <div className="text-lg font-semibold text-blue-600">{item.averagePain?.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No hay jugadores para los filtros seleccionados</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* RPE Chart Dialog */}
        <Dialog open={showRPEChart} onOpenChange={setShowRPEChart}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Promedios de Carga Interna por Categoría</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {/* Filtros de fecha y ordenamiento */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtros</h3>
                <div className="flex items-center gap-2 md:gap-4 flex-wrap md:flex-nowrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Desde:</label>
                    <input
                      type="date"
                      value={rpeDateFrom}
                      onChange={(e) => setRpeDateFrom(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Hasta:</label>
                    <input
                      type="date"
                      value={rpeDateTo}
                      onChange={(e) => setRpeDateTo(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <Button 
                    onClick={() => { /* Props-driven; no action needed */ }}
                    className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                        Buscar
                      </span>
                    </div>
                  </Button>
                  <Button 
                    onClick={() => { setRpeDateFrom(""); setRpeDateTo(""); }}
                    variant="outline"
                    className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                        Limpiar
                      </span>
                    </div>
                  </Button>
                  <div className="flex items-center gap-2 md:ml-4 ml-0 whitespace-nowrap">
                    <label className="text-sm text-gray-600">Ordenar:</label>
                    <select 
                      value={rpeSortOrder}
                      onChange={(e) => setRpeSortOrder(e.target.value as 'asc' | 'desc')}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="asc">Menor a mayor promedio</option>
                      <option value="desc">Mayor a menor promedio</option>
                    </select>
                  </div>
                </div>
              </div>

              {selectedCategory && (
                <RPEAverageChart 
                  categoryId={selectedCategory}
                  isSenior={categories?.some(cat => cat.id === selectedCategory && 'senior_season_id' in cat)}
                />
              )}
              {/* Lista de jugadores - Carga Interna (estilo Wellness, sin colores) */}
              <div className="mt-8">
                {([...rpePlayers]
                  .sort((a: any, b: any) => rpeSortOrder === 'asc' ? a.averageInternalLoad - b.averageInternalLoad : b.averageInternalLoad - a.averageInternalLoad)
                ).length > 0 ? (
                  <div className="space-y-3">
                    {([...rpePlayers]
                      .sort((a: any, b: any) => rpeSortOrder === 'asc' ? a.averageInternalLoad - b.averageInternalLoad : b.averageInternalLoad - a.averageInternalLoad)
                    ).map((item: any) => (
                      <div
                        key={item.player.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center shadow-sm"
                      >
                        <div>
                          <h4 className="font-semibold text-base text-gray-900">{item.player.name}</h4>
                          <p className="text-xs text-gray-500">Total de respuestas: {item.totalResponses}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-700">Promedio carga interna</div>
                          <div className="text-lg font-semibold text-blue-600">{item.averageInternalLoad?.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No hay jugadores para los filtros seleccionados</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Injured Players Modal */}
        <Dialog open={showInjuredPlayersModal} onOpenChange={setShowInjuredPlayersModal}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle>Jugadores Lesionados</DialogTitle>
              <Button
                onClick={() => handleDownloadInjuredPlayersReport()}
                className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                <div className="relative flex items-center justify-center gap-2">
                  <FileDown className="h-4 w-4 text-primary-foreground" />
                  <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                    Descargar Excel
                  </span>
                </div>
              </Button>
            </DialogHeader>
            <div className="py-4">
              {/* Filtros de fecha y ordenamiento */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtros</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Desde:</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Hasta:</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <Button 
                    onClick={handleDateFilter}
                    className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                        Buscar
                      </span>
                    </div>
                  </Button>
                  <Button 
                    onClick={handleClearFilter}
                    variant="outline"
                    className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                        Limpiar
                      </span>
                    </div>
                  </Button>
                  <div className="flex items-center gap-2 ml-4">
                    <label className="text-sm text-gray-600">Ordenar:</label>
                    <select 
                      value={sortOrder}
                      onChange={(e) => handleSortChange(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="desc">Más reciente a más antiguo</option>
                      <option value="asc">Más antiguo a más reciente</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tabla de jugadores lesionados */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">Nombre</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Fecha</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Descripción de la Lesión</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Tratamiento Recomendado</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Estado</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInjuredPlayers.map((player) => (
                      <tr key={player.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2">{player.name}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          {player.injury?.date 
                            ? new Date(player.injury.date).toLocaleDateString('es-ES')
                            : 'N/A'
                          }
                        </td>
                        <td 
                          className="border border-gray-300 px-4 py-2 cursor-pointer hover:bg-gray-100 max-w-xs"
                          onClick={() => {
                            if (player.injury?.injury_description) {
                              setSelectedInjury(player.injury.injury_description);
                              setShowInjuryModal(true);
                            }
                          }}
                        >
                          <div className="truncate" title="Click para ver completo">
                            {player.injury?.injury_description || 'N/A'}
                          </div>
                        </td>
                        <td 
                          className="border border-gray-300 px-4 py-2 cursor-pointer hover:bg-gray-100 max-w-xs"
                          onClick={() => {
                            if (player.injury?.recommended_treatment) {
                              setSelectedTreatment(player.injury.recommended_treatment);
                              setShowTreatmentModal(true);
                            }
                          }}
                        >
                          <div className="truncate" title="Click para ver completo">
                            {player.injury?.recommended_treatment || 'N/A'}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Activa
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handlePlayerSelect(player.id);
                              setShowInjuredPlayersModal(false);
                            }}
                          >
                            Ver detalles
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Ailment Players Modal */}
        <Dialog open={showAilmentPlayersModal} onOpenChange={setShowAilmentPlayersModal}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle>Jugadores con Malestares</DialogTitle>
              <Button
                onClick={() => handleDownloadAilmentPlayersReport()}
                className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                <div className="relative flex items-center justify-center gap-2">
                  <FileDown className="h-4 w-4 text-primary-foreground" />
                  <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                    Descargar Excel
                  </span>
                </div>
              </Button>
            </DialogHeader>
            <div className="py-4">
              {/* Filtros de fecha y ordenamiento */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtros</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Desde:</label>
                    <input
                      type="date"
                      value={ailmentDateFrom}
                      onChange={(e) => setAilmentDateFrom(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Hasta:</label>
                    <input
                      type="date"
                      value={ailmentDateTo}
                      onChange={(e) => setAilmentDateTo(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <Button 
                    onClick={handleAilmentDateFilter}
                    className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                        Buscar
                      </span>
                    </div>
                  </Button>
                  <Button 
                    onClick={handleAilmentClearFilter}
                    variant="outline"
                    className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                        Limpiar
                      </span>
                    </div>
                  </Button>
                  <div className="flex items-center gap-2 ml-4">
                    <label className="text-sm text-gray-600">Ordenar:</label>
                    <select 
                      value={ailmentSortOrder}
                      onChange={(e) => handleAilmentSortChange(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="desc">Más reciente a más antiguo</option>
                      <option value="asc">Más antiguo a más reciente</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tabla de jugadores con malestares */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">Nombre</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Fecha</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Descripción del Malestar</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Estado</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAilmentPlayers.map((player) => (
                      <tr key={player.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2">{player.name}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          {player.ailment?.date 
                            ? new Date(player.ailment.date).toLocaleDateString('es-ES')
                            : 'N/A'
                          }
                        </td>
                        <td 
                          className="border border-gray-300 px-4 py-2 cursor-pointer hover:bg-gray-100 max-w-xs"
                          onClick={() => {
                            if (player.ailment?.description) {
                              setSelectedAilment(player.ailment.description);
                              setShowAilmentModal(true);
                            }
                          }}
                        >
                          <div className="truncate" title="Click para ver completo">
                            {player.ailment?.description || 'N/A'}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Activa
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handlePlayerSelect(player.id);
                              setShowAilmentPlayersModal(false);
                            }}
                          >
                            Ver detalles
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Ailment Details Modal */}
        <Dialog open={showAilmentModal} onOpenChange={setShowAilmentModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Descripción del Malestar - Detalles Completos</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedAilment}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Treatment Details Modal */}
        <Dialog open={showTreatmentModal} onOpenChange={setShowTreatmentModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tratamiento Recomendado - Detalles Completos</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedTreatment}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Injury Description Details Modal */}
        <Dialog open={showInjuryModal} onOpenChange={setShowInjuryModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Descripción de la Lesión - Detalles Completos</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedInjury}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Wellness History Modal */}
        <Dialog open={showWellnessHistoryModal} onOpenChange={setShowWellnessHistoryModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle>Formulario Wellness - Histórico de Jugadores</DialogTitle>
              <Button
                onClick={() => handleDownloadWellnessPlayersReport()}
                className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                <div className="relative flex items-center justify-center gap-2">
                  <FileDown className="h-4 w-4 text-primary-foreground" />
                  <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                    Descargar Excel
                  </span>
                </div>
              </Button>
            </DialogHeader>
            <div className="py-4">
              {/* Filtros de fecha */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtros</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-600">Desde:</label>
                    <input
                      type="date"
                      value={wellnessDateFrom}
                      onChange={(e) => setWellnessDateFrom(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-600">Hasta:</label>
                    <input
                      type="date"
                      value={wellnessDateTo}
                      onChange={(e) => setWellnessDateTo(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                    />
                  </div>
                  <Button 
                    onClick={handleWellnessDateFilter}
                    className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                        Buscar
                      </span>
                    </div>
                  </Button>
                  <Button 
                    onClick={handleWellnessClearFilter}
                    variant="outline"
                    className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                        Limpiar
                      </span>
                    </div>
                  </Button>
                  <div className="flex items-center gap-2 ml-4">
                    <label className="text-sm text-gray-600">Ordenar:</label>
                    <select 
                      value={wellnessSortOrder}
                      onChange={(e) => handleWellnessSortChange(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="asc">Menor a mayor promedio</option>
                      <option value="desc">Mayor a menor promedio</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Gráfico de Barras */}
              <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Promedio de Respuestas Wellness {wellnessDateFrom && wellnessDateTo ? 
                    `(${format(new Date(`${wellnessDateFrom}T00:00:00`), 'dd/MM/yyyy')} - ${format(new Date(`${wellnessDateTo}T23:59:59`), 'dd/MM/yyyy')})` : 
                    '(Histórico)'
                  }
                </h3>
                <div id="wellness-chart">
                  <WellnessBarChart 
                    data={(() => {
                    // Función para obtener datos filtrados dinámicamente
                    const getFilteredData = () => {
                      if (!historicalWellnessResponses || historicalWellnessResponses.length === 0) return [];
                      
                      let filtered = [...historicalWellnessResponses];
                      
                       if (wellnessDateFrom && wellnessDateTo) {
                         const fromDate = new Date(`${wellnessDateFrom}T00:00:00`);
                         const toDate = new Date(`${wellnessDateTo}T23:59:59`);
                        
                        filtered = historicalWellnessResponses.map((playerData: any) => {
                          const filteredResponses = playerData.responses?.filter((response: any) => {
                            if (!response.created_at) return false;
                            const responseDate = new Date(response.created_at);
                            return responseDate >= fromDate && responseDate <= toDate;
                          }) || [];
                          
                          return { ...playerData, responses: filteredResponses };
                        }).filter((playerData: any) => playerData.responses.length > 0);
                      }
                      
                      return filtered;
                    };
                    
                    const dataToUse = getFilteredData();
                    const allResponses = dataToUse.reduce((acc: any[], playerData: any) => {
                      if (playerData.responses && Array.isArray(playerData.responses)) {
                        return acc.concat(playerData.responses);
                      }
                      return acc;
                    }, []);
                    
                    return allResponses;
                  })()}
                />
                </div>
              </div>

              {(() => {
                // Función para obtener datos filtrados dinámicamente para el listado
                const getFilteredData = () => {
                  if (!historicalWellnessResponses || historicalWellnessResponses.length === 0) return [];
                  
                  let filtered = [...historicalWellnessResponses];
                  
                   if (wellnessDateFrom && wellnessDateTo) {
                     const fromDate = new Date(`${wellnessDateFrom}T00:00:00`);
                     const toDate = new Date(`${wellnessDateTo}T23:59:59`);
                    
                    filtered = historicalWellnessResponses.map((playerData: any) => {
                      const filteredResponses = playerData.responses?.filter((response: any) => {
                        if (!response.created_at) return false;
                        const responseDate = new Date(response.created_at);
                        return responseDate >= fromDate && responseDate <= toDate;
                      }) || [];
                      
                      if (filteredResponses.length === 0) return null;
                      
                      // Recalcular promedio para respuestas filtradas
                      const totalSum = filteredResponses.reduce((sum: number, response: any) => {
                        return sum + (response.sleep_quality || 0) + (response.fatigue_level || 0) + 
                               (response.stress_level || 0) + (response.muscle_soreness || 0);
                      }, 0);
                      const totalQuestions = filteredResponses.length * 4;
                      const newAverage = totalQuestions > 0 ? totalSum / totalQuestions : 0;
                      
                      return {
                        ...playerData,
                        responses: filteredResponses,
                        average: Math.round(newAverage * 100) / 100,
                        totalResponses: filteredResponses.length
                      };
                    }).filter(Boolean);
                    
                    // Aplicar ordenamiento
                    filtered.sort((a: any, b: any) => {
                      if (wellnessSortOrder === "asc") {
                        return a.average - b.average;
                      } else {
                        return b.average - a.average;
                      }
                    });
                  }
                  
                  return filtered;
                };
                
                const displayData = getFilteredData();
                
                return displayData.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 mb-4">
                      Jugadores ordenados por promedio {wellnessDateFrom && wellnessDateTo ? 'del período seleccionado' : 'histórico'} (promedio más bajo = mayor atención requerida). 
                      Rangos de atención: Crítica (1-3), Moderada (3-7), Óptimo (8-10)
                    </p>
                    {displayData.map((playerData) => {
                    const { player, average, totalResponses, responses } = playerData;
                    let bgColor = "";
                    let textColor = "text-white";
                    
                    if (average >= 1 && average <= 3) {
                      bgColor = "bg-red-500";
                    } else if (average > 3 && average <= 7) {
                      bgColor = "bg-yellow-500";
                      textColor = "text-gray-800";
                    } else if (average > 7 && average <= 10) {
                      bgColor = "bg-green-500";
                    }
                    
                    // Calcular promedios por variable
                    const avgSleep = responses.reduce((sum: number, r: any) => sum + (r.sleep_quality || 0), 0) / responses.length;
                    const avgFatigue = responses.reduce((sum: number, r: any) => sum + (r.fatigue_level || 0), 0) / responses.length;
                    const avgMuscle = responses.reduce((sum: number, r: any) => sum + (r.muscle_soreness || 0), 0) / responses.length;
                    const avgStress = responses.reduce((sum: number, r: any) => sum + (r.stress_level || 0), 0) / responses.length;
                    
                    return (
                      <div
                        key={player.id}
                        className={`${bgColor} ${textColor} p-4 rounded-lg flex justify-between items-center shadow-md`}
                      >
                        <div>
                          <h4 className="font-semibold text-lg">{player.name}</h4>
                          <p className="text-sm opacity-90">
                            Promedio histórico: {average}/10
                          </p>
                          <p className="text-xs opacity-75">
                            Total de respuestas: {totalResponses}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs opacity-90 space-y-1">
                            <div>Calidad del sueño: {Math.round(avgSleep * 100) / 100}</div>
                            <div>Fatiga: {Math.round(avgFatigue * 100) / 100}</div>
                            <div>Dolor muscular: {Math.round(avgMuscle * 100) / 100}</div>
                            <div>Estrés: {Math.round(avgStress * 100) / 100}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No se han registrado respuestas de wellness en esta categoría</p>
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </main>
    </div>
  );
}
