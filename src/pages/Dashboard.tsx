import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useLocation } from "react-router-dom";
import { AddCategoryButton } from "@/components/dashboard/AddCategoryButton";
import { CategoryCard } from "@/components/dashboard/CategoryCard";
import { AddCategoryModal } from "@/components/modals/AddCategoryModal";
import { AddPlayerModal } from "@/components/modals/AddPlayerModal";
import { AddMatchModal } from "@/components/modals/AddMatchModal";
import { AddSeasonModal } from "@/components/modals/AddSeasonModal";
import { PlayersList } from "@/components/dashboard/PlayersList";
import { MatchesList } from "@/components/dashboard/MatchesList";
import { PlayerEvaluation } from "@/components/evaluation/PlayerEvaluation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { UserPlus, CalendarPlus, Plus, Users, Edit, Trash, Menu } from "lucide-react";
import { DeleteConfirmationDialog } from "@/components/modals/DeleteConfirmationDialog";
import { SeasonMenu } from "@/components/dashboard/SeasonMenu";
import { TransferPlayerModal } from "@/components/modals/TransferPlayerModal";
import { AddCoachModal } from "@/components/modals/AddCoachModal";
import { TransferCoachModal } from "@/components/modals/TransferCoachModal";
import { ComplementaryMaterialsList } from "@/components/dashboard/ComplementaryMaterialsList";
import { Coach } from "@/types/coach";
import { usePermissions } from "@/hooks/use-permissions";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";
import { getOrganizationLogo } from '@/config/organizationLogos';
import { PreloadedImage } from "@/components/ui/preloaded-image";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("categories");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showAddSeason, setShowAddSeason] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"players" | "matches" | "material">("players");
  const { toast } = useToast();
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<{ id: string; name: string } | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSeason, setSelectedSeason] = useState<{ id: string; name: string } | null>(null);
  const [seasonToEdit, setSeasonToEdit] = useState<{ id: string; name: string } | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [seasonToDelete, setSeasonToDelete] = useState<{ id: string; name: string } | null>(null);
  const [playerToTransfer, setPlayerToTransfer] = useState<any>(null);
  const [showAddCoach, setShowAddCoach] = useState(false);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [showTransferCoach, setShowTransferCoach] = useState(false);
  const [coachToTransfer, setCoachToTransfer] = useState<any>(null);
  const [complementaryMaterials, setComplementaryMaterials] = useState<any[]>([]);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false); // Estado para el modal de jugadores
  const { canEdit } = usePermissions();
  const canModify = canEdit("senior_football");
  const location = useLocation();
  const { theme, getGradientClasses, organizationId } = useOrganizationTheme();

  const fetchCategories = async () => {
    if (!selectedSeason || !organizationId) return;
    
    // @ts-ignore - Supabase type inference issue
    const response = await supabase
      .from("senior_categories")
      .select("*")
      .eq('senior_season_id', selectedSeason.id)
      .eq('organization_id', organizationId)
      .order('name');
    
    const { data, error } = response as { data: any[] | null, error: any };
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las categorías",
      });
      return;
    }
    setCategories(data || []);
  };

  const fetchPlayers = async (categoryId: string) => {
    if (!organizationId) return;
    
    console.log("Fetching players for senior category:", categoryId, "org:", organizationId);
    
    // @ts-ignore - Supabase type inference issue
    const response = await supabase
      .from("players")
      .select("*")
      .or(`senior_category_id.eq.${categoryId},category_id.eq.${categoryId}`)
      .eq("is_deleted", false)
      .eq("organization_id", organizationId);
    
    const { data, error } = response as { data: any[] | null, error: any };
    
    if (error) {
      console.error("Error fetching players:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los jugadores",
      });
      return;
    }

    // Auto-asignar jugadores sin categoría creados desde Añadir Personal
    if (categoryId && organizationId) {
      const { error: assignError } = await supabase
        .from("players")
        .update({ senior_category_id: categoryId })
        .eq("organization_id", organizationId)
        .is("senior_category_id", null)
        .is("category_id", null);

      if (!assignError) {
        const refetch = await supabase
          .from("players")
          .select("*")
          .or(`senior_category_id.eq.${categoryId},category_id.eq.${categoryId}`)
          .eq("is_deleted", false)
          .eq("organization_id", organizationId);
        const { data: refetchData } = refetch as { data: any[] | null, error: any };
        setPlayers(refetchData || []);
        return;
      }
    }
    setPlayers(data || []);
  };

  const fetchMatches = async (categoryId: string) => {
    if (!selectedSeason || !organizationId) return;

    // @ts-ignore - Supabase type inference issue
    const response = await supabase
      .from("matches")
      .select("*")
      .eq("senior_category_id", categoryId)
      .eq("senior_season_id", selectedSeason.id)
      .eq("organization_id", organizationId)
      .order('date', { ascending: false });
    
    const { data, error } = response as { data: any[] | null, error: any };
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los partidos",
      });
      return;
    }
    setMatches(data || []);
  };

  const fetchSeasons = async () => {
    if (!organizationId) return;
    
    // @ts-ignore - Supabase type inference issue
    const response = await supabase
      .from("senior_seasons")
      .select("*")
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    const { data, error } = response as { data: any[] | null, error: any };
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las temporadas",
      });
      return;
    }
    
    const validSeasons = (data || []).map(season => ({
      id: season.id,
      name: season.name
    }));
    
    setSeasons(validSeasons);
  };

  const fetchCoaches = async (categoryId: string) => {
    if (!organizationId) return;
    
    try {
      console.log("Fetching coaches for category:", categoryId);
      
      // Fetch coaches through assignments table
      const { data, error } = await supabase
        .from('coach_category_assignments')
        .select(`
          *,
          coaches!inner (
            id,
            name,
            age,
            email,
            image_url,
            senior_category_id,
            user_id,
            created_at,
            organization_id
          )
        `)
        .eq('senior_category_id', categoryId)
        .eq('coaches.organization_id', organizationId!);
      
      if (error) {
        console.error("Error fetching coaches:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los entrenadores",
        });
        return;
      }
      
      // Extract coaches from assignments
      const coachesData = data?.map((assignment: any) => ({
        ...(assignment.coaches || {}),
        role: assignment.role,
        assignment_id: assignment.id
      })) || [];
      
      console.log("Coaches fetched:", coachesData);
      setCoaches(coachesData);
    } catch (error) {
      console.error("Error in fetchCoaches:", error);
    }
  };
  
  const fetchComplementaryMaterials = async (categoryId: string) => {
    if (!selectedSeason || !organizationId) return;

    try {
    // @ts-ignore - Supabase type inference issue
    const response = await supabase
      .from('complementary_materials')
      .select('*')
      .eq('senior_category_id', categoryId)
      .eq('senior_season_id', selectedSeason.id)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    const { data, error } = response as { data: any[] | null, error: any };

      if (error) {
        console.error('Error fetching complementary materials:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los materiales complementarios",
        });
        return;
      }

      setComplementaryMaterials(data || []);
    } catch (error) {
      console.error('Error in fetchComplementaryMaterials:', error);
    }
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setPlayers([]);
    setMatches([]);
    setActiveView("players");
  };

  const handleEditCategory = async (categoryId: string) => {
    if (!canModify) {
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "No tienes permisos para editar categorías",
      });
      return;
    }

    const categoryToEdit = categories.find(cat => cat.id === categoryId);
    if (categoryToEdit) {
      setCategoryToEdit(categoryToEdit);
      setShowAddCategory(true);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!canModify) {
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "No tienes permisos para eliminar categorías",
      });
      return;
    }

    try {
      await supabase.from('players').delete().eq('senior_category_id', categoryId);
      await supabase.from('matches').delete().eq('senior_category_id', categoryId);
      
      const { error } = await supabase.from('senior_categories').delete().eq('id', categoryId);
      
      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Categoría eliminada correctamente",
      });

      if (selectedCategory === categoryId) {
        setSelectedCategory(null);
        setPlayers([]);
        setMatches([]);
      }

      fetchCategories();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la categoría",
      });
    }
  };

  const handleAddCategory = async (name: string) => {
    if (!canModify) {
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "No tienes permisos para añadir o editar categorías",
      });
      return;
    }

    if (!selectedSeason) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar una temporada primero",
      });
      return;
    }

    if (categoryToEdit) {
      const { error } = await supabase
        .from("senior_categories")
        .update({ name })
        .eq('id', categoryToEdit.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo actualizar la categoría",
        });
        return;
      }

      toast({
        title: "Éxito",
        description: "Categoría actualizada correctamente",
      });
      setCategoryToEdit(null);
    } else {
      const { error } = await supabase
        .from("senior_categories")
        .insert([{ name, senior_season_id: selectedSeason.id, organization_id: organizationId }]);
        
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo crear la categoría",
        });
        return;
      }
      toast({
        title: "Éxito",
        description: "Categoría creada correctamente",
      });
    }
    fetchCategories();
  };

  const handleAddPlayer = async (playerData: any) => {
    if (!canModify) {
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "No tienes permisos para añadir jugadores",
      });
      return;
    }

    // Si el jugador fue creado por trigger (alta con credenciales), solo refrescar lista
    if (playerData?.refresh) {
      console.log("Refreshing players list after trigger creation...");
      if (selectedCategory) {
        // Añadir un pequeño delay adicional para asegurar que el trigger se completó
        setTimeout(async () => {
          await fetchPlayers(selectedCategory);
        }, 500);
      }
      return;
    }

    try {
      // Para fútbol primer equipo, asegurarnos de que se está pasando senior_category_id
      const insertData = {
        ...playerData,
        senior_category_id: selectedCategory,
        organization_id: organizationId
      };
      
      console.log("Inserting player with data:", insertData);
      
      const { error } = await supabase
        .from("players")
        .insert([insertData]);

      if (error) {
        console.error("Error adding player:", error);
        throw error;
      }

      toast({
        title: "Éxito",
        description: "Jugador añadido correctamente",
      });

      if (selectedCategory) {
        // Refrescar inmediatamente
        await fetchPlayers(selectedCategory);
      }
    } catch (error) {
      console.error("Error in handleAddPlayer:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo añadir el jugador",
      });
    }
  };

  const handleEditPlayer = async (playerData: any) => {
    try {
      // Convertir cadenas vacías a null para campos UUID
      const cleanedData = {
        ...playerData,
        category_id: playerData.category_id || null,
        senior_category_id: playerData.senior_category_id || null
      };
      
      const { error } = await supabase
        .from("players")
        .update(cleanedData)
        .eq('id', playerData.id);

      if (error) throw error;

      // Actualizar inmediatamente el estado local para reflejar los cambios
      setPlayers(prevPlayers => 
        prevPlayers.map(player => 
          player.id === playerData.id 
            ? { ...player, ...playerData } 
            : player
        )
      );

      toast({
        title: "Éxito",
        description: "Jugador actualizado correctamente",
      });

      // Refrescar desde la base de datos para asegurar consistencia
      if (selectedCategory) {
        fetchPlayers(selectedCategory);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el jugador",
      });
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!canModify) {
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "No tienes permisos para eliminar jugadores",
      });
      return;
    }

    try {
      // Primero obtener los datos del jugador para verificar si tiene usuario asociado
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("email, user_id")
        .eq("id", playerId)
        .single();

      if (playerError) {
        console.error("Error obteniendo datos del jugador:", playerError);
      }

      // Si el jugador tiene un email asociado, buscar y eliminar el usuario
      if (playerData?.email || playerData?.user_id) {
        try {
          let userId = playerData.user_id;
          
          // Si no hay user_id pero hay email, buscar el usuario por email
          if (!userId && playerData.email) {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id')
              .eq('email', playerData.email)
              .single();
              
            if (!userError && userData) {
              userId = userData.id;
            }
          }
          
          // Eliminar el usuario si se encontró
          if (userId) {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
              const supabaseUrl = new URL("https://pdrpxdgzosnuysuzzprr.supabase.co");
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
                console.error("Error eliminando usuario del sistema de autenticación");
              }
            }
          }
        } catch (userDeleteError) {
          console.error("Error eliminando usuario asociado:", userDeleteError);
          // Continuamos con la eliminación del jugador aunque falle la eliminación del usuario
        }
      }

      // Marcar el jugador como eliminado
      const { error } = await supabase
        .from("players")
        .update({ is_deleted: true })
        .eq("id", playerId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Jugador y usuario asociado eliminados correctamente",
      });

      // Actualizar la lista local de jugadores
      if (selectedCategory) {
        fetchPlayers(selectedCategory);
      }
    } catch (error) {
      console.error("Error deleting player:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el jugador",
      });
    }
  };

  const handleAddMatch = async (matchData: any) => {
    if (!canModify) {
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "No tienes permisos para añadir partidos",
      });
      return;
    }

    if (!selectedSeason) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar una temporada primero",
      });
      return;
    }

    if (!selectedCategory) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar una categoría primero",
      });
      return;
    }

    try {
      console.log("Creating match with data:", matchData);
      console.log("Selected season:", selectedSeason);
      console.log("Selected category:", selectedCategory);
      
      const { data, error } = await supabase
        .from("matches")
        .insert([{ 
          opponent: matchData.opponent,
          date: matchData.date,
          location: matchData.location,
          ohiggins_score: matchData.ohiggins_score,
          opponent_score: matchData.opponent_score,
          senior_category_id: selectedCategory,
          senior_season_id: selectedSeason.id,
          season_id: null, // Explicitly set to null for senior matches
          organization_id: organizationId // Add organization_id for RLS policy
        }])
        .select();

      if (error) {
        console.error("Error al crear el partido:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: `No se pudo crear el partido: ${error.message}`,
        });
        return;
      }

      console.log("Match created successfully:", data);

      toast({
        title: "Éxito",
        description: "Partido añadido correctamente",
      });

      if (selectedCategory) {
        await fetchMatches(selectedCategory);
      }
      
      setShowAddMatch(false);
    } catch (error) {
      console.error("Error detallado:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo añadir el partido",
      });
    }
  };

  const handleEditMatch = async (matchData: any) => {
    try {
      const { error } = await supabase
        .from("matches")
        .update(matchData)
        .eq('id', matchData.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Partido actualizado correctamente",
      });

      if (selectedCategory) {
        fetchMatches(selectedCategory);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el partido",
      });
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq('id', matchId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Partido eliminado correctamente",
      });

      if (selectedCategory) {
        fetchMatches(selectedCategory);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el partido",
      });
    }
  };

  const handleEvaluateMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    setShowEvaluation(true);
  };

  const handleAddSeason = async (seasonData: { name: string }) => {
    try {
      const { error } = await supabase
        .from("senior_seasons")
        .insert([{ ...seasonData, organization_id: organizationId }]);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Temporada creada correctamente",
      });

      fetchSeasons();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear la temporada",
      });
    }
  };

  const handleSeasonSelect = async (season: { id: string; name: string }) => {
    setSelectedSeason(season);
    setSelectedCategory(null);
    setActiveView("players");
  };

  const handleEditSeason = async (seasonData: { name: string }) => {
    try {
      const { error } = await supabase
        .from("senior_seasons")
        .update({ name: seasonData.name })
        .eq('id', seasonToEdit?.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Temporada actualizada correctamente",
      });

      fetchSeasons();
      setSeasonToEdit(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la temporada",
      });
    }
  };

  const handleDeleteSeason = async () => {
    if (!canModify) {
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "No tienes permisos para eliminar temporadas",
      });
      return;
    }

    if (!seasonToDelete) return;

    try {
      const { error } = await supabase
        .from("senior_seasons")
        .delete()
        .eq('id', seasonToDelete.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Temporada eliminada correctamente",
      });

      if (selectedSeason?.id === seasonToDelete.id) {
        setSelectedSeason(null);
      }

      fetchSeasons();
      setSeasonToDelete(null);
      setShowDeleteConfirmation(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la temporada",
      });
    }
  };

  const handlePlayerTransfer = () => {
    if (selectedCategory) {
      fetchPlayers(selectedCategory);
    }
  };

  const handleAddCoach = async (coachData: Coach) => {
    try {
      console.log("Adding coach with data:", coachData);
      
      // Insert coach data into coaches table (only valid columns)
      const formattedCoachData = {
        name: coachData.name,
        age: coachData.age?.toString() || null,
        email: coachData.email || null,
        image_url: coachData.image_url || null,
        category_id: selectedCategory, // Required by table constraint
        senior_category_id: selectedCategory,
        organization_id: organizationId
      };

      const { data: insertedCoach, error: coachError } = await supabase
        .from('coaches')
        .insert([formattedCoachData])
        .select()
        .single();

      if (coachError) {
        console.error("Error inserting coach:", coachError);
        throw coachError;
      }

      // If email and password are provided, create user automatically with football editor access
      if (coachData.email && coachData.password) {
        try {
          console.log("Creating user account for coach with email:", coachData.email);
          
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: coachData.email,
            password: coachData.password,
            options: {
              data: {
                football_access: 'visualizador', // Default to visualizador globally
                medical_players_access: 'sin_acceso',
                medical_staff_access: 'sin_acceso',
                physical_access: 'sin_acceso',
                youth_records_access: 'sin_acceso',
                staff_access: 'sin_acceso'
              }
            }
          });

          if (authError) {
            console.error("Error creating user account for coach:", authError);
            // Don't throw here, coach was created successfully
            toast({
              variant: "destructive",
              title: "Advertencia",
              description: "Entrenador creado pero no se pudo crear la cuenta de usuario: " + authError.message,
            });
          } else {
            console.log("User account created successfully for coach:", authData);
            
            // Update coach with user_id and email
            const { error: updateError } = await supabase
              .from('coaches')
              .update({ 
                user_id: authData.user?.id,
                email: coachData.email 
              })
              .eq('name', coachData.name)
              .eq('senior_category_id', selectedCategory);

            if (updateError) {
              console.error("Error updating coach with user_id:", updateError);
            }

            // Create coach-category assignment with editor role for the specific category
            const { error: assignmentError } = await supabase
              .from('coach_category_assignments')
              .insert({
                coach_id: insertedCoach.id,
                category_id: null, // Null for senior categories
                senior_category_id: selectedCategory,
                role: 'editor'
              });

            if (assignmentError) {
              console.error("Error creating coach assignment:", assignmentError);
            }

            toast({
              title: "Éxito",
              description: "Entrenador y cuenta de usuario creados correctamente",
            });
          }
        } catch (userError) {
          console.error("Error creating user for coach:", userError);
          toast({
            variant: "destructive", 
            title: "Advertencia",
            description: "Entrenador creado pero no se pudo crear la cuenta de usuario",
          });
        }
      } else {
        toast({
          title: "Éxito",
          description: "Entrenador añadido correctamente",
        });
      }

      if (selectedCategory) {
        fetchCoaches(selectedCategory);
      }
    } catch (error) {
      console.error("Error in handleAddCoach:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo añadir el entrenador",
      });
    }
  };

  const handleEditCoach = async (coachData: Coach) => {
    try {
      console.log("Editing coach with data:", coachData);
      
      // Only update valid columns in coaches table
      const formattedCoachData = {
        name: coachData.name,
        age: coachData.age?.toString() || null,
        email: coachData.email || null,
        image_url: coachData.image_url || null,
        senior_category_id: selectedCategory
      };

      const { error } = await supabase
        .from("coaches")
        .update(formattedCoachData)
        .eq('id', coachData.id);

      if (error) {
        console.error("Error updating coach:", error);
        throw error;
      }

      toast({
        title: "Éxito",
        description: "Entrenador actualizado correctamente",
      });

      if (selectedCategory) {
        fetchCoaches(selectedCategory);
      }
    } catch (error) {
      console.error("Error in handleEditCoach:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el entrenador",
      });
    }
  };

  const handleDeleteCoach = async (coachId: string) => {
    try {
      console.log("Deleting coach assignment with ID:", coachId, "from category:", selectedCategory);
      
      // Only delete the assignment for this specific category, not the entire coach
      const { error } = await supabase
        .from("coach_category_assignments")
        .delete()
        .eq('coach_id', coachId)
        .eq('senior_category_id', selectedCategory);

      if (error) {
        console.error("Error deleting coach assignment:", error);
        throw error;
      }

      toast({
        title: "Éxito",
        description: "Entrenador removido de esta categoría correctamente",
      });

      if (selectedCategory) {
        fetchCoaches(selectedCategory);
      }
    } catch (error) {
      console.error("Error in handleDeleteCoach:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo remover el entrenador de esta categoría",
      });
    }
  };
  
  const handleTransferCoach = async () => {
    // Refresh coaches in current category
    if (selectedCategory) {
      fetchCoaches(selectedCategory);
    }
  };

  useEffect(() => {
    if (activeTab === "categories" && organizationId) {
      fetchSeasons();
    }
  }, [activeTab, organizationId]);

  useEffect(() => {
    if (selectedSeason && organizationId) {
      fetchCategories();
    }
  }, [selectedSeason, organizationId]);

  useEffect(() => {
    if (selectedCategory && organizationId) {
      fetchPlayers(selectedCategory);
      fetchCoaches(selectedCategory);
      if (activeView === "matches") {
        fetchMatches(selectedCategory);
      } else if (activeView === "material") {
        fetchComplementaryMaterials(selectedCategory);
      }
    }
  }, [selectedCategory, activeView, organizationId]);

  // Resetear al inicio de Fútbol Primer Equipo cuando se reciba el parámetro ?home=1
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('home') === '1') {
      setActiveTab('categories');
      setSelectedSeason(null);
      setSelectedCategory(null);
      setActiveView('players');
      setShowEvaluation(false);
      setSelectedMatchId(null);
      setPlayerToTransfer(null);
      setCoachToTransfer(null);
      setShowAddPlayer(false);
      setShowAddMatch(false);
      setShowAddSeason(false);
      setShowAddCoach(false);
    }
  }, [location.search]);

  if (showEvaluation && selectedCategory && selectedMatchId) {
    return (
      <PlayerEvaluation
        categoryId={selectedCategory}
        matchId={selectedMatchId}
        onBack={() => {
          setShowEvaluation(false);
          setSelectedMatchId(null);
        }}
      />
    );
  }

  const selectedCategoryName = categories.find(cat => cat.id === selectedCategory)?.name;

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
              aria-label={sidebarVisible ? "Ocultar menú" : "Mostrar menú"}
            >
              <Menu className="w-6 h-6 text-white" />
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
          <h1 className="text-2xl font-bold mb-4 mt-8">Fútbol Primer Equipo</h1>
        

        {activeTab === "categories" && !selectedSeason && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Seleccionar Temporada</h2>
              {canModify && (
                <Button
                  onClick={() => {
                    setSeasonToEdit(null);
                    setShowAddSeason(true);
                  }}
                   className={`relative bg-gradient-to-br ${getGradientClasses('primary')} border-2 border-border rounded-xl p-2.5 ${getGradientClasses('hover')} transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2`}
                 >
                   <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                   <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                   <div className="relative flex items-center justify-center gap-2">
                     <Plus className="w-4 h-4 text-white" />
                     <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-white">
                       Nueva Temporada
                     </span>
                   </div>
                 </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {seasons.map((season) => (
                <div key={season.id} className={`relative bg-gradient-to-br ${getGradientClasses('primary')} border-2 border-border rounded-xl p-4 ${getGradientClasses('hover')} transition-all duration-300 shadow-2xl transform hover:scale-105`}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                  <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                  <div className="relative flex justify-between items-center">
                    <button
                      onClick={() => handleSeasonSelect(season)}
                      className="text-left flex-grow text-primary-foreground font-rajdhani font-semibold uppercase tracking-wider"
                    >
                      {season.name}
                    </button>
                    {canModify && (
                      <SeasonMenu
                        onEdit={() => {
                          setSeasonToEdit(season);
                          setShowAddSeason(true);
                        }}
                        onDelete={() => {
                          setSeasonToDelete(season);
                          setShowDeleteConfirmation(true);
                        }}
                      />
                    )}
                  </div>
                  <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "categories" && selectedSeason && !selectedCategory && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedSeason(null)}
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
                <h2 className="text-xl font-semibold">Temporada: {selectedSeason.name}</h2>
              </div>
              {canModify && (
                <AddCategoryButton onClick={() => {
                  setCategoryToEdit(null);
                  setShowAddCategory(true);
                }} />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  id={category.id}
                  name={category.name}
                  onAddPlayer={() => {
                    setSelectedCategory(category.id);
                    setShowAddPlayer(true);
                    setActiveView("players");
                  }}
                  onAddMatch={() => {
                    setSelectedCategory(category.id);
                    setShowAddMatch(true);
                  }}
                  onShowPlayers={() => {
                    setSelectedCategory(category.id);
                    setActiveView("players");
                  }}
                  onEdit={handleEditCategory}
                  onDelete={handleDeleteCategory}
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

            {selectedCategoryName && (
              <h2 className="text-2xl font-bold mb-6">{selectedCategoryName}</h2>
            )}

            <div className="flex flex-wrap gap-4 mb-4">
              <button
                className={
                  activeView === "players"
                    ? `relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl px-4 py-2 transition-none`
                    : `relative rounded-xl px-4 py-2 transition-none text-muted-foreground`
                }
                onClick={() => setActiveView("players")}
              >
                {activeView === "players" && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                  </>
                )}
                <div className="relative">
                  <span className={`text-sm font-rajdhani font-semibold uppercase tracking-wider ${activeView === 'players' ? 'text-primary-foreground' : ''}`}>
                    Jugadores
                  </span>
                </div>
                {activeView === "players" && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                )}
              </button>
              <button
                className={
                  activeView === "matches"
                    ? `relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl px-4 py-2 transition-none`
                    : `relative rounded-xl px-4 py-2 transition-none text-muted-foreground`
                }
                onClick={() => setActiveView("matches")}
              >
                {activeView === "matches" && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                  </>
                )}
                <div className="relative">
                  <span className={`text-sm font-rajdhani font-semibold uppercase tracking-wider ${activeView === 'matches' ? 'text-primary-foreground' : ''}`}>
                    Partidos
                  </span>
                </div>
                {activeView === "matches" && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                )}
              </button>
              <button
                className={
                  activeView === "material"
                    ? `relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl px-4 py-2 transition-none`
                    : `relative rounded-xl px-4 py-2 transition-none text-muted-foreground`
                }
                onClick={() => setActiveView("material")}
              >
                {activeView === "material" && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                  </>
                )}
                <div className="relative">
                  <span className={`text-sm font-rajdhani font-semibold uppercase tracking-wider ${activeView === 'material' ? 'text-primary-foreground' : ''}`}>
                    Material Complementario
                  </span>
                </div>
                {activeView === "material" && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                )}
              </button>
            </div>

            {activeView === "players" && (
              <div className="space-y-4">
                {canModify && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowAddPlayerModal(true)}
                      className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl px-4 py-2 transition-all duration-300 shadow-lg transform hover:scale-105 w-full`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl"></div>
                      <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                      <div className="relative flex items-center justify-center gap-2">
                        <UserPlus className="w-4 h-4 text-primary-foreground" />
                        <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                          Añadir Jugador
                        </span>
                      </div>
                      <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    </button>
                    <button
                      onClick={() => setShowAddCoach(true)}
                      className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl px-4 py-2 transition-all duration-300 shadow-lg transform hover:scale-105 w-full`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl"></div>
                      <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                      <div className="relative flex items-center justify-center gap-2">
                        <UserPlus className="w-4 h-4 text-primary-foreground" />
                        <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                          Añadir Entrenador
                        </span>
                      </div>
                      <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    </button>
                  </div>
                )}
                {(players.length > 0 || coaches.length > 0) && (
                  <PlayersList 
                    players={players}
                    coaches={coaches}
                    onEdit={canModify ? handleEditPlayer : undefined}
                    onEditCoach={canModify ? handleEditCoach : undefined}
                    onDelete={canModify ? handleDeletePlayer : undefined}
                    onDeleteCoach={canModify ? handleDeleteCoach : undefined}
                    onTransfer={canModify ? (player) => setPlayerToTransfer(player) : undefined}
                    onTransferCoach={canModify ? (coach) => setCoachToTransfer(coach) : undefined}
                  />
                )}
              </div>
            )}

            {activeView === "matches" && (
              <div className="space-y-4">
                {canModify && (
                  <div className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl p-4 transition-all duration-300 shadow-2xl transform hover:scale-105 cursor-pointer`}
                    onClick={() => setShowAddMatch(true)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                    <div className="relative flex items-center justify-center gap-2 text-primary-foreground font-medium">
                      <CalendarPlus className="w-5 h-5" />
                      Crear Partido
                    </div>
                  </div>
                )}
                {matches.length > 0 && (
                  <MatchesList 
                    matches={matches}
                    onEdit={canModify ? handleEditMatch : undefined}
                    onDelete={canModify ? handleDeleteMatch : undefined}
                    onEvaluate={handleEvaluateMatch}
                  />
                )}
              </div>
            )}

            {activeView === "material" && (
              <ComplementaryMaterialsList
                materials={complementaryMaterials}
                onRefresh={() => fetchComplementaryMaterials(selectedCategory!)}
                categoryId={selectedCategory!}
                seasonId={selectedSeason!.id}
              />
            )}
          </div>
        )}

        <AddCategoryModal
          isOpen={showAddCategory}
          onClose={() => {
            setShowAddCategory(false);
            setCategoryToEdit(null);
          }}
          onAdd={handleAddCategory}
          initialData={categoryToEdit?.name}
        />

        {/* Modal para añadir jugador cuando se hace clic en el botón */}
        <AddPlayerModal
          isOpen={showAddPlayerModal}
          onClose={() => setShowAddPlayerModal(false)}
          onAdd={handleAddPlayer}
          categoryId={undefined}
          seniorCategoryId={selectedCategory || ""}
        />
        
        {/* Modal para añadir jugador al hacer clic en la tarjeta de categoría */}
        <AddPlayerModal
          isOpen={showAddPlayer}
          onClose={() => setShowAddPlayer(false)}
          onAdd={handleAddPlayer}
          categoryId={undefined}
          seniorCategoryId={selectedCategory || ""}
        />

        <AddMatchModal
          isOpen={showAddMatch}
          onClose={() => setShowAddMatch(false)}
          onAdd={handleAddMatch}
          seasonId={selectedSeason?.id || ""}
          categoryId={selectedCategory || ""}
        />

        <AddSeasonModal
          isOpen={showAddSeason || seasonToEdit !== null}
          onClose={() => {
            setShowAddSeason(false);
            setSeasonToEdit(null);
          }}
          onAdd={seasonToEdit ? handleEditSeason : handleAddSeason}
          initialData={seasonToEdit}
        />

        <AddCoachModal
          isOpen={showAddCoach}
          onClose={() => setShowAddCoach(false)}
          onAdd={handleAddCoach}
          categoryId={selectedCategory || ""}
        />

        <DeleteConfirmationDialog
          isOpen={showDeleteConfirmation}
          onClose={() => {
            setShowDeleteConfirmation(false);
            setSeasonToDelete(null);
          }}
          onConfirm={handleDeleteSeason}
          title="Eliminar Temporada"
          description={`¿Estás seguro de que deseas eliminar la temporada "${seasonToDelete?.name}"? Esta acción no se puede deshacer.`}
        />

        {playerToTransfer && (
          <TransferPlayerModal
            isOpen={true}
            onClose={() => setPlayerToTransfer(null)}
            playerId={playerToTransfer.id}
            currentCategoryId={playerToTransfer.category_id}
            onTransfer={handlePlayerTransfer}
          />
        )}

        {coachToTransfer && (
          <TransferCoachModal
            isOpen={true}
            onClose={() => setCoachToTransfer(null)}
            onTransfer={handleTransferCoach}
            coachId={coachToTransfer.id}
            coachName={coachToTransfer.name}
            currentCategoryId={coachToTransfer.category_id}
          />
        )}
        </div>
      </main>
    </div>
  );
}
