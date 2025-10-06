import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { FileDown } from "lucide-react";
import * as XLSX from 'xlsx';
import { usePermissions } from "@/hooks/use-permissions";
import { Json } from "@/integrations/supabase/types";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

interface Player {
  id: string;
  name: string;
  position?: string;
  image_url?: string;
  updated_at?: string;
  deleted?: boolean;
}

interface PlayerEvaluationProps {
  categoryId: string;
  matchId: string;
  onBack: () => void;
}

interface EvaluationForm {
  yellowCards?: number;
  redCards?: number;
  goals?: number;
  goalTypes: string[];
  assists?: number;
  minutesPlayed?: number;
  saves?: number;
  crosses?: number;
  rating?: number;
  comments: string;
  matchPosition: string;
}

interface PlayerEvaluation {
  id: string;
  yellow_cards: number;
  red_cards: number;
  goals: number;
  goal_types: { type: string }[];
  assists: number;
  minutes_played: number;
  saves: number;
  crosses: number;
  rating: number;
  comments: string;
  player_id: string;
  match_position?: string;
  goalkeeper_evaluation?: Record<string, number>;
}

interface GoalkeeperEvaluation {
  comunicacion_adecuada: number;
  comunicacion_preventiva: number;
  lectura_pasiva: number;
  lectura_activa: number;
  punos_cantidad: number;
  punos_calificacion: number;
  descuelgue_cantidad: number;
  descuelgue_calificacion: number;
  uno_vs_uno_cantidad: number;
  uno_vs_uno_calificacion: number;
  gol_rival_alto_cantidad: number;
  gol_rival_alto_calificacion: number;
  gol_rival_medio_cantidad: number;
  gol_rival_medio_calificacion: number;
  pie_defensivo_controles: number;
  pie_defensivo_continuidad: number;
  pie_ofensivo_inicio: number;
  pie_ofensivo_salteo: number;
  pie_ofensivo_asistencias: number;
}

const goalTypeOptions = [
  { value: "header", label: "De cabeza" },
  { value: "penalty", label: "De penal" },
  { value: "outside_box", label: "Fuera del área con pie" },
  { value: "inside_box", label: "Dentro del área con pie" },
];

const positionOptions = [
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

export function PlayerEvaluation({ categoryId, matchId, onBack }: PlayerEvaluationProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationForm>({
    yellowCards: undefined,
    redCards: undefined,
    goals: undefined,
    goalTypes: [],
    assists: undefined,
    minutesPlayed: undefined,
    saves: undefined,
    crosses: undefined,
    rating: undefined,
    comments: "",
    matchPosition: "",
  });
  const [evaluations, setEvaluations] = useState<Record<string, PlayerEvaluation>>({});
  const [goalkeeperEval, setGoalkeeperEval] = useState<GoalkeeperEvaluation>({
    comunicacion_adecuada: 1,
    comunicacion_preventiva: 1,
    lectura_pasiva: 1,
    lectura_activa: 1,
    punos_cantidad: 0,
    punos_calificacion: 1,
    descuelgue_cantidad: 0,
    descuelgue_calificacion: 1,
    uno_vs_uno_cantidad: 0,
    uno_vs_uno_calificacion: 1,
    gol_rival_alto_cantidad: 0,
    gol_rival_alto_calificacion: 1,
    gol_rival_medio_cantidad: 0,
    gol_rival_medio_calificacion: 1,
    pie_defensivo_controles: 1,
    pie_defensivo_continuidad: 1,
    pie_ofensivo_inicio: 1,
    pie_ofensivo_salteo: 1,
    pie_ofensivo_asistencias: 1
  });
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const { getGradientClasses } = useOrganizationTheme();

  const fetchPlayers = async () => {
    // Primero intentar obtener jugadores de categoría senior (primer equipo)
    let currentPlayers, currentError;
    
    // Verificar si es una categoría senior buscando en matches para determinar el tipo
    const { data: matchData } = await supabase
      .from("matches")
      .select("senior_category_id, category_id, organization_id")
      .eq("id", matchId)
      .single();

    if (matchData?.senior_category_id) {
      // Es un partido de primer equipo, buscar jugadores por senior_category_id
      const result = await supabase
        .from("players")
        .select("*")
        .eq("senior_category_id", matchData.senior_category_id)
        .eq("is_deleted", false)
        .eq("organization_id", matchData.organization_id);
      currentPlayers = result.data;
      currentError = result.error;
    } else {
      // Es un partido de fútbol joven, buscar jugadores por category_id
      const result = await supabase
        .from("players")
        .select("*")
        .eq("category_id", matchData.category_id)
        .eq("is_deleted", false)
        .eq("organization_id", matchData.organization_id);
      currentPlayers = result.data;
      currentError = result.error;
    }

    // Luego obtener jugadores que han participado en evaluaciones de este partido
    const { data: evaluatedPlayers, error: evaluatedError } = await supabase
      .from("match_statistics")
      .select(`
        player_id,
        players (*)
      `)
      .eq("match_id", matchId);

    if (currentError && evaluatedError) {
      console.error("Error fetching players:", currentError, evaluatedError);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los jugadores",
      });
      return;
    }

    const currentPlayersList = currentPlayers || [];
    const evaluatedPlayersList = evaluatedPlayers?.map(ep => ({
      ...ep.players,
      deleted: true // Marcar como eliminado si no está en la lista actual
    })).filter(p => p && p.name && p.id && !currentPlayersList.find(cp => cp.id === p.id)) || [];

    const allPlayers = [
      ...currentPlayersList,
      ...evaluatedPlayersList
    ];
    
    console.log("Players loaded for evaluation:", allPlayers);
    setPlayers(allPlayers);
  };

  const fetchEvaluations = async () => {
    const { data, error } = await supabase
      .from("match_statistics")
      .select("*")
      .eq("match_id", matchId);

    if (!error && data) {
      const evaluationsMap: Record<string, PlayerEvaluation> = {};
      data.forEach((evaluation) => {
        evaluationsMap[evaluation.player_id] = {
          ...evaluation,
          goal_types: Array.isArray(evaluation.goal_types) 
            ? evaluation.goal_types.map((gt: any) => ({ type: gt.type })) 
            : [],
          goalkeeper_evaluation: evaluation.goalkeeper_evaluation as Record<string, number> | null
        };
      });
      setEvaluations(evaluationsMap);
    }
  };

  useEffect(() => {
    fetchPlayers();
    fetchEvaluations();
  }, [categoryId, matchId]);

  const handleBack = () => {
    if (selectedPlayer) {
      setSelectedPlayer(null);
      setEvaluation({
        yellowCards: undefined,
        redCards: undefined,
        goals: undefined,
        goalTypes: [],
        assists: undefined,
        minutesPlayed: undefined,
        saves: undefined,
        crosses: undefined,
        rating: undefined,
        comments: "",
        matchPosition: "",
      });
    } else {
      onBack();
    }
  };

  const handleAddGoalType = (value: string) => {
    if (evaluation.goalTypes.length < (evaluation.goals || 0)) {
      setEvaluation({
        ...evaluation,
        goalTypes: [...evaluation.goalTypes, value]
      });
    }
  };

  const handleRemoveGoalType = (index: number) => {
    setEvaluation({
      ...evaluation,
      goalTypes: evaluation.goalTypes.filter((_, i) => i !== index)
    });
  };

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    const existingEvaluation = evaluations[player.id];
    
    if (existingEvaluation) {
      setEvaluation({
        yellowCards: existingEvaluation.yellow_cards,
        redCards: existingEvaluation.red_cards,
        goals: existingEvaluation.goals,
        goalTypes: existingEvaluation.goal_types?.map(gt => gt.type) || [],
        assists: existingEvaluation.assists,
        minutesPlayed: existingEvaluation.minutes_played,
        saves: existingEvaluation.saves,
        crosses: existingEvaluation.crosses,
        rating: existingEvaluation.rating,
        comments: existingEvaluation.comments || "",
        matchPosition: existingEvaluation.match_position || "",
      });

      if (existingEvaluation.goalkeeper_evaluation) {
        const gkEval = existingEvaluation.goalkeeper_evaluation;
        setGoalkeeperEval({
          comunicacion_adecuada: gkEval.comunicacion_adecuada || 1,
          comunicacion_preventiva: gkEval.comunicacion_preventiva || 1,
          lectura_pasiva: gkEval.lectura_pasiva || 1,
          lectura_activa: gkEval.lectura_activa || 1,
          punos_cantidad: gkEval.punos_cantidad || 0,
          punos_calificacion: gkEval.punos_calificacion || 1,
          descuelgue_cantidad: gkEval.descuelgue_cantidad || 0,
          descuelgue_calificacion: gkEval.descuelgue_calificacion || 1,
          uno_vs_uno_cantidad: gkEval.uno_vs_uno_cantidad || 0,
          uno_vs_uno_calificacion: gkEval.uno_vs_uno_calificacion || 1,
          gol_rival_alto_cantidad: gkEval.gol_rival_alto_cantidad || 0,
          gol_rival_alto_calificacion: gkEval.gol_rival_alto_calificacion || 1,
          gol_rival_medio_cantidad: gkEval.gol_rival_medio_cantidad || 0,
          gol_rival_medio_calificacion: gkEval.gol_rival_medio_calificacion || 1,
          pie_defensivo_controles: gkEval.pie_defensivo_controles || 1,
          pie_defensivo_continuidad: gkEval.pie_defensivo_continuidad || 1,
          pie_ofensivo_inicio: gkEval.pie_ofensivo_inicio || 1,
          pie_ofensivo_salteo: gkEval.pie_ofensivo_salteo || 1,
          pie_ofensivo_asistencias: gkEval.pie_ofensivo_asistencias || 1
        });
      } else {
        setGoalkeeperEval({
          comunicacion_adecuada: 1,
          comunicacion_preventiva: 1,
          lectura_pasiva: 1,
          lectura_activa: 1,
          punos_cantidad: 0,
          punos_calificacion: 1,
          descuelgue_cantidad: 0,
          descuelgue_calificacion: 1,
          uno_vs_uno_cantidad: 0,
          uno_vs_uno_calificacion: 1,
          gol_rival_alto_cantidad: 0,
          gol_rival_alto_calificacion: 1,
          gol_rival_medio_cantidad: 0,
          gol_rival_medio_calificacion: 1,
          pie_defensivo_controles: 1,
          pie_defensivo_continuidad: 1,
          pie_ofensivo_inicio: 1,
          pie_ofensivo_salteo: 1,
          pie_ofensivo_asistencias: 1
        });
      }
    } else {
      setEvaluation({
        yellowCards: undefined,
        redCards: undefined,
        goals: undefined,
        goalTypes: [],
        assists: undefined,
        minutesPlayed: undefined,
        saves: undefined,
        crosses: undefined,
        rating: undefined,
        comments: "",
        matchPosition: "",
      });
      setGoalkeeperEval({
        comunicacion_adecuada: 1,
        comunicacion_preventiva: 1,
        lectura_pasiva: 1,
        lectura_activa: 1,
        punos_cantidad: 0,
        punos_calificacion: 1,
        descuelgue_cantidad: 0,
        descuelgue_calificacion: 1,
        uno_vs_uno_cantidad: 0,
        uno_vs_uno_calificacion: 1,
        gol_rival_alto_cantidad: 0,
        gol_rival_alto_calificacion: 1,
        gol_rival_medio_cantidad: 0,
        gol_rival_medio_calificacion: 1,
        pie_defensivo_controles: 1,
        pie_defensivo_continuidad: 1,
        pie_ofensivo_inicio: 1,
        pie_ofensivo_salteo: 1,
        pie_ofensivo_asistencias: 1
      });
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedPlayer) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se ha seleccionado ningún jugador",
      });
      return;
    }

    try {
      const formattedGoalTypes = evaluation.goalTypes.map(type => ({ type }));
      const existingEvaluation = evaluations[selectedPlayer.id];

      const goalkeeperEvaluation = selectedPlayer.position === 'portero' || evaluation.matchPosition === 'portero' 
        ? goalkeeperEval
        : null;

      const evaluationData = {
        match_id: matchId,
        player_id: selectedPlayer.id,
        yellow_cards: evaluation.yellowCards || 0,
        red_cards: evaluation.redCards || 0,
        goals: evaluation.goals || 0,
        goal_types: formattedGoalTypes,
        assists: selectedPlayer.position === 'portero' ? 0 : (evaluation.assists || 0),
        minutes_played: evaluation.minutesPlayed || 0,
        saves: evaluation.saves || 0,
        crosses: evaluation.crosses || 0,
        rating: evaluation.rating || 1,
        comments: evaluation.comments || '',
        match_position: evaluation.matchPosition || '',
        goalkeeper_evaluation: goalkeeperEvaluation as unknown as Json
      };

      let result;
      
      if (existingEvaluation) {
        result = await supabase
          .from("match_statistics")
          .update(evaluationData)
          .eq('id', existingEvaluation.id)
          .select()
          .maybeSingle();
      } else {
        result = await supabase
          .from("match_statistics")
          .insert(evaluationData)
          .select()
          .maybeSingle();
      }

      if (result.error) {
        throw result.error;
      }

      await fetchEvaluations();
      
      toast({
        title: "Éxito",
        description: existingEvaluation 
          ? "Evaluación actualizada correctamente" 
          : "Evaluación guardada correctamente",
      });

      setSelectedPlayer(null);
      setEvaluation({
        yellowCards: undefined,
        redCards: undefined,
        goals: undefined,
        goalTypes: [],
        assists: undefined,
        minutesPlayed: undefined,
        saves: undefined,
        crosses: undefined,
        rating: undefined,
        comments: "",
        matchPosition: "",
      });
    } catch (error) {
      console.error('Error al guardar la evaluación:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la evaluación. Por favor, intenta nuevamente.",
      });
    }
  };

  const getPositionLabel = (value: string) => {
    const position = positionOptions.find(pos => pos.value === value);
    return position ? position.label : value;
  };

  const handleDownloadExcel = async () => {
    try {
      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      // Si hay jugador seleccionado (vista individual), filtrar por ese jugador
      let query = supabase
        .from('match_statistics')
        .select(`
          *,
          players (
            name,
            position
          )
        `)
        .eq('match_id', matchId);

      if (selectedPlayer) {
        query = query.eq('player_id', selectedPlayer.id);
      }

      const { data: evaluationsWithPlayers } = await query;

      if (!evaluationsWithPlayers) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron obtener las evaluaciones",
        });
        return;
      }

      // En vista individual, si no hay evaluación guardada del jugador, mostrar aviso
      if (selectedPlayer && evaluationsWithPlayers.length === 0) {
        toast({
          variant: "destructive",
          title: "Sin datos",
          description: `El jugador ${selectedPlayer.name} no tiene evaluaciones guardadas para este partido`,
        });
        return;
      }

      const goalkeepers = evaluationsWithPlayers.filter(
        item => item.players?.position === 'portero' || 
               item.match_position === 'portero'
      );
      
      const fieldPlayers = evaluationsWithPlayers.filter(
        item => item.players?.position !== 'portero' && 
               item.match_position !== 'portero'
      );

      const fieldPlayersData = fieldPlayers.map((evaluation) => ({
        'Nombre': evaluation.players?.name || '',
        'Posición en el Partido': getPositionLabel(evaluation.match_position || ''),
        'Minutos Jugados': evaluation.minutes_played || 0,
        'Tarjetas Amarillas': evaluation.yellow_cards || 0,
        'Tarjetas Rojas': evaluation.red_cards || 0,
        'Goles': evaluation.goals || 0,
        'Tipos de Gol': Array.isArray(evaluation.goal_types) 
          ? evaluation.goal_types.map((gt: any) => goalTypeOptions.find(opt => opt.value === gt.type)?.label).join(', ') 
          : '',
        'Asistencias': evaluation.assists || 0,
        'Atajadas': evaluation.saves || 0,
        'Centros': evaluation.crosses || 0,
        'Calificación': evaluation.rating || 1,
        'Comentarios': evaluation.comments || ''
      }));

      const goalkeepersData = goalkeepers.map((evaluation) => {
        const gkEval = evaluation.goalkeeper_evaluation || {};
        
        return {
          'Nombre': evaluation.players?.name || '',
          'Posición en el Partido': getPositionLabel(evaluation.match_position || ''),
          'Minutos Jugados': evaluation.minutes_played || 0,
          'Tarjetas Amarillas': evaluation.yellow_cards || 0,
          'Tarjetas Rojas': evaluation.red_cards || 0,
          'Goles': evaluation.goals || 0,
          'Atajadas': evaluation.saves || 0,
          'Calificación General': evaluation.rating || 1,
          'Comentarios': evaluation.comments || '',
          'Comunicación - Adecuada (1-7)': (gkEval as any)?.comunicacion_adecuada || 1,
          'Comunicación - Preventiva (1-7)': (gkEval as any)?.comunicacion_preventiva || 1,
          'Lectura de Juego - Pasiva (1-7)': (gkEval as any)?.lectura_pasiva || 1,
          'Lectura de Juego - Activa (1-7)': (gkEval as any)?.lectura_activa || 1,
          'Despejes con Puños - Cantidad': (gkEval as any)?.punos_cantidad || 0,
          'Despejes con Puños - Calificación (1-7)': (gkEval as any)?.punos_calificacion || 1,
          'Descuelgue - Cantidad': (gkEval as any)?.descuelgue_cantidad || 0,
          'Descuelgue - Calificación (1-7)': (gkEval as any)?.descuelgue_calificacion || 1,
          'Duelos 1vs1 - Cantidad': (gkEval as any)?.uno_vs_uno_cantidad || 0,
          'Duelos 1vs1 - Calificación (1-7)': (gkEval as any)?.uno_vs_uno_calificacion || 1,
          'Gol Rival (Riesgo Alto) - Cantidad': (gkEval as any)?.gol_rival_alto_cantidad || 0,
          'Gol Rival (Riesgo Alto) - Calificación (1-7)': (gkEval as any)?.gol_rival_alto_calificacion || 1,
          'Gol Rival (Riesgo Medio) - Cantidad': (gkEval as any)?.gol_rival_medio_cantidad || 0,
          'Gol Rival (Riesgo Medio) - Calificación (1-7)': (gkEval as any)?.gol_rival_medio_calificacion || 1,
          'Pie (Defensivo) - Control de Balón (1-7)': (gkEval as any)?.pie_defensivo_controles || 1,
          'Pie (Defensivo) - Continuidad en el Juego (1-7)': (gkEval as any)?.pie_defensivo_continuidad || 1,
          'Pie (Ofensivo) - Inicio de Jugada (1-7)': (gkEval as any)?.pie_ofensivo_inicio || 1,
          'Pie (Ofensivo) - Pases de Salteo (1-7)': (gkEval as any)?.pie_ofensivo_salteo || 1,
          'Pie (Ofensivo) - Asistencias (1-7)': (gkEval as any)?.pie_ofensivo_asistencias || 1
        };
      });

      const wb = XLSX.utils.book_new();
      
      if (fieldPlayersData.length > 0) {
        const wsFieldPlayers = XLSX.utils.json_to_sheet(fieldPlayersData);
        XLSX.utils.book_append_sheet(wb, wsFieldPlayers, "Jugadores de Campo");
      }
      
      if (goalkeepersData.length > 0) {
        const wsGoalkeepers = XLSX.utils.json_to_sheet(goalkeepersData);
        XLSX.utils.book_append_sheet(wb, wsGoalkeepers, "Porteros");
      }

      const opponent = matchData?.opponent || 'rival';
      const date = matchData?.date ? new Date(matchData.date).toLocaleDateString('es-CL') : 'fecha';
      const fileName = selectedPlayer
        ? `Evaluacion_${selectedPlayer.name}_${opponent}_${date}.xlsx`
        : `Evaluaciones_${opponent}_${date}.xlsx`;
      
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Éxito",
        description: selectedPlayer
          ? `Excel del jugador ${selectedPlayer.name} descargado correctamente`
          : "Excel descargado correctamente",
      });
    } catch (error) {
      console.error('Error downloading excel:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo descargar el excel",
      });
    }
  };

  const groupPlayersByPosition = (players: Player[]) => {
    const groups = {
      goalkeepers: players.filter(p => p.position === 'portero'),
      defenders: players.filter(p => ['defensa_central', 'lateral_izquierdo', 'lateral_derecho'].includes(p.position || '')),
      midfielders: players.filter(p => ['mediocampista_ofensivo', 'mediocampista_defensivo', 'mediocampista_mixto'].includes(p.position || '')),
      forwards: players.filter(p => ['delantero_centro', 'extremo_izquierdo', 'extremo_derecho'].includes(p.position || '')),
      unassigned: players.filter(p => !p.position),
    };

    return groups;
  };

  const renderPlayerGroup = (groupPlayers: Player[], title: string) => {
    if (groupPlayers.length === 0) return null;

    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupPlayers.map((player) => (
            <div 
              key={player.id}
              className={`relative ${
                player.deleted 
                  ? "bg-gradient-to-br from-yellow-100 via-yellow-200 to-yellow-300 border-2 border-yellow-400/50" 
                  : "bg-gradient-to-br " + getGradientClasses('primary') + " border-2 border-border"
              } rounded-xl p-4 transition-all duration-300 shadow-lg transform hover:scale-105 cursor-pointer`}
              onClick={() => handleSelectPlayer(player)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl"></div>
              <div className={`absolute inset-0 ${
                player.deleted ? "bg-yellow-500/10" : "bg-primary/10"
              } rounded-xl backdrop-blur-sm`}></div>
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-12 h-12 border-2 border-border">
                    <AvatarImage 
                      src={player.image_url && player.updated_at ? `${player.image_url}?v=${new Date(player.updated_at).getTime()}` : player.image_url} 
                      alt={player.name} 
                    />
                    <AvatarFallback className={`${
                      player.deleted ? "bg-yellow-500 text-white" : "bg-primary/30 text-primary-foreground"
                    } font-semibold`}>
                      {player.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className={`${
                      player.deleted ? "text-yellow-800" : "text-primary-foreground"
                    } font-rajdhani font-semibold text-lg`}>
                      {player.name}
                    </h4>
                    <p className={`text-sm text-primary-foreground`}>
                      {player.position ? getPositionLabel(player.position) : 'Sin posición'}
                      {player.deleted && <span className="ml-2 font-medium">(Eliminado)</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className={`text-sm text-primary-foreground/80`}>
                    {evaluations[player.id] && (
                      <span className="font-medium">Ya evaluado</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPlayer(player);
                    }}
                    className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border px-3 py-1.5`}
                  >
                    {evaluations[player.id] ? 'Editar' : 'Evaluar'}
                  </Button>
                </div>

                <div className={`absolute top-1 right-1 w-2 h-2 ${
                  evaluations[player.id] ? "bg-green-400" : "bg-yellow-400"
                } rounded-full animate-pulse`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handleBack}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Volver
          </button>
          <Button
            onClick={handleDownloadExcel}
            variant="outline"
            className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
            <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
            <div className="relative flex items-center justify-center gap-2">
              <FileDown className="w-4 h-4 text-primary-foreground" />
              <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                Descargar Excel
              </span>
            </div>
          </Button>
        </div>

        <h2 className="text-2xl font-bold mb-6">Evaluación de Jugadores</h2>

        {!selectedPlayer ? (
          <>
            {(() => {
              const groups = groupPlayersByPosition(players);
              return (
                <>
                  {renderPlayerGroup(groups.goalkeepers, "Porteros")}
                  {renderPlayerGroup(groups.defenders, "Defensas")}
                  {renderPlayerGroup(groups.midfielders, "Mediocampistas")}
                  {renderPlayerGroup(groups.forwards, "Delanteros")}
                  {renderPlayerGroup(groups.unassigned, "Sin posición asignada")}
                </>
              );
            })()}
          </>
        ) : (
          <div className={`relative bg-gradient-to-br ${getGradientClasses('primary')} border-2 border-border rounded-xl p-6 space-y-6 shadow-lg`}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl"></div>
            <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
            <div className="relative">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-primary-foreground">
                  {evaluations[selectedPlayer.id] ? 'Editar evaluación de ' : 'Nueva evaluación para '} 
                  {selectedPlayer.name}
                </h3>
              </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Columna Izquierda */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-foreground mb-1">
                    Posición en el Partido
                  </label>
                  <Select
                    value={evaluation.matchPosition}
                    onValueChange={(value) => setEvaluation({
                      ...evaluation,
                      matchPosition: value
                    })}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70">
                      <SelectValue placeholder="Seleccionar posición" />
                    </SelectTrigger>
                    {/* Hacer el dropdown sólido y con alto z-index para que no se vea transparente ni se superponga visualmente */}
                    <SelectContent className="z-50 bg-white text-gray-900 border border-border shadow-lg">
                      {positionOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-foreground mb-1">
                    Minutos Jugados
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="90"
                    value={evaluation.minutesPlayed || ""}
                    onChange={(e) => setEvaluation({
                      ...evaluation,
                      minutesPlayed: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-foreground mb-1">
                    Tarjetas Amarillas
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={evaluation.yellowCards || ""}
                    onChange={(e) => setEvaluation({
                      ...evaluation,
                      yellowCards: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-foreground mb-1">
                    Tarjetas Rojas
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={evaluation.redCards || ""}
                    onChange={(e) => setEvaluation({
                      ...evaluation,
                      redCards: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                  />
                </div>

                {/* Para jugadores de campo - agregar Goles en columna izquierda */}
                {(selectedPlayer.position !== 'portero' && evaluation.matchPosition !== 'portero') && (
                  <div>
                    <label className="block text-sm font-medium text-primary-foreground mb-1">
                      Goles
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={evaluation.goals || ""}
                      onChange={(e) => {
                        const newGoals = e.target.value ? parseInt(e.target.value) : undefined;
                        setEvaluation({
                          ...evaluation,
                          goals: newGoals,
                          goalTypes: newGoals ? evaluation.goalTypes.slice(0, newGoals) : []
                        });
                      }}
                      className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                    />
                  </div>
                )}

                {/* Campos específicos de portero - Primera mitad */}
                {(selectedPlayer.position === 'portero' || evaluation.matchPosition === 'portero') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Goles
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={evaluation.goals || ""}
                        onChange={(e) => {
                          const newGoals = e.target.value ? parseInt(e.target.value) : undefined;
                          setEvaluation({
                            ...evaluation,
                            goals: newGoals,
                            goalTypes: newGoals ? evaluation.goalTypes.slice(0, newGoals) : []
                          });
                        }}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold mb-2 text-primary-foreground">Comunicación</h4>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Adecuada (1-7)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={goalkeeperEval.comunicacion_adecuada}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          comunicacion_adecuada: parseInt(e.target.value) || 1
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Comunicación Preventiva (1-7)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={goalkeeperEval.comunicacion_preventiva}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          comunicacion_preventiva: parseInt(e.target.value) || 1
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold mb-2 text-primary-foreground">Lectura del juego</h4>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Lectura Pasiva (1-7)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={goalkeeperEval.lectura_pasiva}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          lectura_pasiva: parseInt(e.target.value) || 1
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Lectura Activa (1-7)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={goalkeeperEval.lectura_activa}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          lectura_activa: parseInt(e.target.value) || 1
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold mb-2 text-primary-foreground">Puños</h4>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Cantidad
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={goalkeeperEval.punos_cantidad}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          punos_cantidad: parseInt(e.target.value) || 0
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Puños - Calificación (1-7)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={goalkeeperEval.punos_calificacion}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          punos_calificacion: parseInt(e.target.value) || 1
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold mb-2 text-primary-foreground">Atajadas</h4>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Cantidad
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={evaluation.saves || ""}
                        onChange={(e) => setEvaluation({
                          ...evaluation,
                          saves: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Centros (Cantidad)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={evaluation.crosses || ""}
                        onChange={(e) => setEvaluation({
                          ...evaluation,
                          crosses: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Calificación General (1-7)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={evaluation.rating || ""}
                        onChange={(e) => {
                          const value = e.target.value ? parseInt(e.target.value) : undefined;
                          setEvaluation({
                            ...evaluation,
                            rating: value
                          });
                        }}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>
                  </>
                )}

              </div>

              {/* Columna Derecha */}
              <div className="space-y-4">
                {/* Campos específicos de portero - Segunda mitad */}
                {(selectedPlayer.position === 'portero' || evaluation.matchPosition === 'portero') && (
                  <>
                    <div>
                      <h4 className="text-lg font-semibold mb-2 text-primary-foreground">Descuelgue</h4>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Cantidad
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={goalkeeperEval.descuelgue_cantidad}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          descuelgue_cantidad: parseInt(e.target.value) || 0
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Descuelgue - Calificación (1-7)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={goalkeeperEval.descuelgue_calificacion}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          descuelgue_calificacion: parseInt(e.target.value) || 1
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold mb-2 text-primary-foreground">1 vs 1</h4>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Cantidad
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={goalkeeperEval.uno_vs_uno_cantidad}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          uno_vs_uno_cantidad: parseInt(e.target.value) || 0
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        1 vs 1 - Calificación (1-7)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={goalkeeperEval.uno_vs_uno_calificacion}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          uno_vs_uno_calificacion: parseInt(e.target.value) || 1
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold mb-2 text-primary-foreground">Gol Rival Alto</h4>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Cantidad
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={goalkeeperEval.gol_rival_alto_cantidad}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          gol_rival_alto_cantidad: parseInt(e.target.value) || 0
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Gol Rival Alto - Calificación (1-7)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={goalkeeperEval.gol_rival_alto_calificacion}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          gol_rival_alto_calificacion: parseInt(e.target.value) || 1
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold mb-2 text-primary-foreground">Gol Rival Medio</h4>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Cantidad
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={goalkeeperEval.gol_rival_medio_cantidad}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          gol_rival_medio_cantidad: parseInt(e.target.value) || 0
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Gol Rival Medio - Calificación (1-7)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={goalkeeperEval.gol_rival_medio_calificacion}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          gol_rival_medio_calificacion: parseInt(e.target.value) || 1
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold mb-2 text-primary-foreground">Pie - Defensivo</h4>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Controles Defensivos (1-7)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={goalkeeperEval.pie_defensivo_controles}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          pie_defensivo_controles: parseInt(e.target.value) || 1
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Continuidad Defensiva (1-7)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={goalkeeperEval.pie_defensivo_continuidad}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          pie_defensivo_continuidad: parseInt(e.target.value) || 1
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold mb-2 text-primary-foreground">Pie - Ofensivo</h4>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Inicio Ofensivo (1-7)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={goalkeeperEval.pie_ofensivo_inicio}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          pie_ofensivo_inicio: parseInt(e.target.value) || 1
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Salteo Ofensivo (1-7)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={goalkeeperEval.pie_ofensivo_salteo}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          pie_ofensivo_salteo: parseInt(e.target.value) || 1
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Asistencias Ofensivas (1-7)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={goalkeeperEval.pie_ofensivo_asistencias}
                        onChange={(e) => setGoalkeeperEval({
                          ...goalkeeperEval,
                          pie_ofensivo_asistencias: parseInt(e.target.value) || 1
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>
                  </>
                )}

                {/* Para jugadores de campo - columna derecha */}
                {(selectedPlayer.position !== 'portero' && evaluation.matchPosition !== 'portero') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Tipo de Gol ({evaluation.goalTypes.length} de {evaluation.goals || 0})
                      </label>
                      <Select
                        disabled={evaluation.goalTypes.length >= (evaluation.goals || 0)}
                        onValueChange={handleAddGoalType}
                        value=""
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70">
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/10 border-white/20">
                          {goalTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-primary-foreground hover:bg-white/20">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {evaluation.goalTypes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {evaluation.goalTypes.map((type, index) => (
                            <span 
                              key={`${type}-${index}`} 
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-white/20 text-primary-foreground border border-white/20 group"
                            >
                              {goalTypeOptions.find(opt => opt.value === type)?.label}
                              <button
                                onClick={() => handleRemoveGoalType(index)}
                                className="hover:text-red-300 focus:outline-none"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedPlayer.position !== 'portero' && (
                      <div>
                        <label className="block text-sm font-medium text-primary-foreground mb-1">
                          Asistencias
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={evaluation.assists || ""}
                          onChange={(e) => setEvaluation({
                            ...evaluation,
                            assists: e.target.value ? parseInt(e.target.value) : undefined
                          })}
                          className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Atajadas
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={evaluation.saves || ""}
                        onChange={(e) => setEvaluation({
                          ...evaluation,
                          saves: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Centros
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={evaluation.crosses || ""}
                        onChange={(e) => setEvaluation({
                          ...evaluation,
                          crosses: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-foreground mb-1">
                        Calificación (1-7)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={evaluation.rating || ""}
                        onChange={(e) => {
                          const value = e.target.value ? parseInt(e.target.value) : undefined;
                          setEvaluation({
                            ...evaluation,
                            rating: value
                          });
                        }}
                        className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6">
              <div>
                <label className="block text-sm font-medium text-primary-foreground mb-1">
                  Comentarios
                </label>
                <Textarea
                  value={evaluation.comments}
                  onChange={(e) => setEvaluation({
                    ...evaluation,
                    comments: e.target.value
                  })}
                  placeholder="Ingrese comentarios sobre el desempeño del jugador..."
                  className="min-h-[100px] bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
                />
              </div>

              {canEdit('football') && (
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleSubmitEvaluation}>
                    {evaluations[selectedPlayer.id] ? 'Actualizar' : 'Guardar'} Evaluación
                  </Button>
                </div>
              )}
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
