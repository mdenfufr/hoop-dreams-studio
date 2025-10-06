import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MoreVertical, Edit, Trash, ClipboardList, Users, Search, FileDown } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LineupModal } from "@/components/lineup/LineupModal";
import { EditMatchModal } from "@/components/modals/EditMatchModal";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

interface Match {
  id: string;
  opponent: string;
  date: string;
  location: string | null;
  category_id?: string;
  season_id?: string;
  senior_category_id?: string;
  senior_season_id?: string;
  ohiggins_score?: number | null;
  opponent_score?: number | null;
}

interface MatchesListProps {
  matches: Match[];
  onEdit?: (match: Match) => void;
  onDelete?: (matchId: string) => void;
  onEvaluate?: (matchId: string) => void;
  isYouthFootball?: boolean;
}

interface PlayerStatistics {
  matches: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  crosses: number;
  minutes_played: number;
  total_rating: number;
  positions: Set<string>;
}

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

const goalTypeOptions = [
  { value: "header", label: "De cabeza" },
  { value: "penalty", label: "De penal" },
  { value: "outside_box", label: "Fuera del área con pie" },
  { value: "inside_box", label: "Dentro del área con pie" },
];

export function MatchesList({ matches, onEdit, onDelete, onEvaluate, isYouthFootball = false }: MatchesListProps) {
  const [showLineup, setShowLineup] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [showEvaluationOptions, setShowEvaluationOptions] = useState(false);
  const [matchToEvaluate, setMatchToEvaluate] = useState<string | null>(null);
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const hasEditPermission = canEdit('football');
  const { getGradientClasses } = useOrganizationTheme();

  const handleEdit = (match: Match) => {
    setSelectedMatch(match);
    setShowEditModal(true);
  };

  const handleDelete = (matchId: string) => {
    setMatchToDelete(matchId);
    setShowDeleteDialog(true);
  };

  const getMatchResult = (ohigginsScore: number | null | undefined, opponentScore: number | null | undefined) => {
    if (ohigginsScore === null || opponentScore === null || ohigginsScore === undefined || opponentScore === undefined) {
      return "No especificado";
    }
    if (ohigginsScore > opponentScore) return "Victoria";
    if (ohigginsScore < opponentScore) return "Derrota";
    return "Empate";
  };

  const handleSearch = () => {
    if (!startDate || !endDate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor selecciona ambas fechas",
      });
      return;
    }

    const filtered = matches.filter(match => {
      const matchDate = new Date(match.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      return matchDate >= start && matchDate <= end;
    });

    setFilteredMatches(filtered);
  };

  const handleDownloadSummary = async () => {
    try {
      if (filteredMatches.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No hay partidos en el rango de fechas seleccionado",
        });
        return;
      }

      const allEvaluations = [];
      
      for (const match of filteredMatches) {
        const { data: evaluations } = await supabase
          .from('match_statistics')
          .select(`
            *,
            players (
              name,
              position
            )
          `)
          .eq('match_id', match.id);
          
        if (evaluations) {
          allEvaluations.push(...evaluations);
        }
      }

      const playerStats = allEvaluations
        .filter(evaluation => 
          evaluation.players?.position !== 'portero' && 
          evaluation.match_position !== 'portero'
        )
        .reduce<Record<string, PlayerStatistics>>((acc, evaluation) => {
          const hasParticipated = 
            (evaluation.yellow_cards && evaluation.yellow_cards > 0) ||
            (evaluation.red_cards && evaluation.red_cards > 0) ||
            (evaluation.goals && evaluation.goals > 0) ||
            (evaluation.assists && evaluation.assists > 0) ||
            (evaluation.minutes_played && evaluation.minutes_played > 0) ||
            (evaluation.saves && evaluation.saves > 0) ||
            (evaluation.crosses && evaluation.crosses > 0) ||
            (evaluation.rating && evaluation.rating > 1) ||
            (evaluation.comments && evaluation.comments.trim() !== "") ||
            (evaluation.match_position && evaluation.match_position.trim() !== "");

          if (!hasParticipated) {
            return acc;
          }

          const playerName = evaluation.players?.name || 'Desconocido';
          
          if (!acc[playerName]) {
            acc[playerName] = {
              matches: 0,
              goals: 0,
              assists: 0,
              yellow_cards: 0,
              red_cards: 0,
              saves: 0,
              crosses: 0,
              minutes_played: 0,
              total_rating: 0,
              positions: new Set<string>(),
            };
          }

          acc[playerName].matches += 1;
          acc[playerName].goals += evaluation.goals || 0;
          acc[playerName].assists += evaluation.assists || 0;
          acc[playerName].yellow_cards += evaluation.yellow_cards || 0;
          acc[playerName].red_cards += evaluation.red_cards || 0;
          acc[playerName].saves += evaluation.saves || 0;
          acc[playerName].crosses += evaluation.crosses || 0;
          acc[playerName].minutes_played += evaluation.minutes_played || 0;
          acc[playerName].total_rating += evaluation.rating || 0;
          if (evaluation.match_position) {
            acc[playerName].positions.add(getPositionLabel(evaluation.match_position));
          }

          return acc;
        }, {});

      const summaryData = Object.entries(playerStats).map(([playerName, stats]) => ({
        'Jugador': playerName,
        'Partidos Jugados': stats.matches,
        'Goles': stats.goals,
        'Promedio Goles por Partido': (stats.goals / stats.matches).toFixed(2),
        'Asistencias': stats.assists,
        'Promedio Asistencias por Partido': (stats.assists / stats.matches).toFixed(2),
        'Tarjetas Amarillas': stats.yellow_cards,
        'Tarjetas Rojas': stats.red_cards,
        'Atajadas': stats.saves,
        'Promedio Atajadas por Partido': (stats.saves / stats.matches).toFixed(2),
        'Centros': stats.crosses,
        'Promedio Centros por Partido': (stats.crosses / stats.matches).toFixed(2),
        'Minutos Jugados': stats.minutes_played,
        'Promedio Minutos por Partido': (stats.minutes_played / stats.matches).toFixed(2),
        'Calificación Promedio': (stats.total_rating / stats.matches).toFixed(2),
        'Posiciones Jugadas': Array.from(stats.positions).join(', '),
      }));

      const goalkeeperEvaluations = allEvaluations.filter(evaluation => 
        evaluation.players?.position === 'portero' || evaluation.match_position === 'portero'
      );

      const goalkeeperStats = goalkeeperEvaluations.reduce((acc: Record<string, any>, evaluation) => {
        const playerName = evaluation.players?.name || 'Desconocido';
        const gkEval = evaluation.goalkeeper_evaluation || {};
        
        if (!acc[playerName]) {
          acc[playerName] = {
            matches: 0,
            minutes_played: 0,
            goals: 0,
            saves: 0,
            rating_total: 0,
            yellow_cards_total: 0,
            red_cards_total: 0,
            positions: new Set<string>(),
            comunicacion_adecuada_total: 0,
            comunicacion_preventiva_total: 0,
            lectura_pasiva_total: 0,
            lectura_activa_total: 0,
            punos_cantidad_total: 0,
            punos_calificacion_total: 0,
            descuelgue_cantidad_total: 0,
            descuelgue_calificacion_total: 0,
            uno_vs_uno_cantidad_total: 0,
            uno_vs_uno_calificacion_total: 0,
            gol_rival_alto_cantidad_total: 0,
            gol_rival_alto_calificacion_total: 0,
            gol_rival_medio_cantidad_total: 0,
            gol_rival_medio_calificacion_total: 0,
            pie_defensivo_controles_total: 0,
            pie_defensivo_continuidad_total: 0,
            pie_ofensivo_inicio_total: 0,
            pie_ofensivo_salteo_total: 0,
            pie_ofensivo_asistencias_total: 0,
          };
        }

        acc[playerName].matches += 1;
        acc[playerName].minutes_played += evaluation.minutes_played || 0;
        acc[playerName].goals += evaluation.goals || 0;
        acc[playerName].saves += evaluation.saves || 0;
        acc[playerName].rating_total += evaluation.rating || 0;
        acc[playerName].yellow_cards_total += evaluation.yellow_cards || 0;
        acc[playerName].red_cards_total += evaluation.red_cards || 0;
        if (evaluation.match_position) {
          acc[playerName].positions.add(getPositionLabel(evaluation.match_position));
        }
        
        acc[playerName].comunicacion_adecuada_total += gkEval.comunicacion_adecuada || 0;
        acc[playerName].comunicacion_preventiva_total += gkEval.comunicacion_preventiva || 0;
        acc[playerName].lectura_pasiva_total += gkEval.lectura_pasiva || 0;
        acc[playerName].lectura_activa_total += gkEval.lectura_activa || 0;
        acc[playerName].punos_cantidad_total += gkEval.punos_cantidad || 0;
        acc[playerName].punos_calificacion_total += gkEval.punos_calificacion || 0;
        acc[playerName].descuelgue_cantidad_total += gkEval.descuelgue_cantidad || 0;
        acc[playerName].descuelgue_calificacion_total += gkEval.descuelgue_calificacion || 0;
        acc[playerName].uno_vs_uno_cantidad_total += gkEval.uno_vs_uno_cantidad || 0;
        acc[playerName].uno_vs_uno_calificacion_total += gkEval.uno_vs_uno_calificacion || 0;
        acc[playerName].gol_rival_alto_cantidad_total += gkEval.gol_rival_alto_cantidad || 0;
        acc[playerName].gol_rival_alto_calificacion_total += gkEval.gol_rival_alto_calificacion || 0;
        acc[playerName].gol_rival_medio_cantidad_total += gkEval.gol_rival_medio_cantidad || 0;
        acc[playerName].gol_rival_medio_calificacion_total += gkEval.gol_rival_medio_calificacion || 0;
        acc[playerName].pie_defensivo_controles_total += gkEval.pie_defensivo_controles || 0;
        acc[playerName].pie_defensivo_continuidad_total += gkEval.pie_defensivo_continuidad || 0;
        acc[playerName].pie_ofensivo_inicio_total += gkEval.pie_ofensivo_inicio || 0;
        acc[playerName].pie_ofensivo_salteo_total += gkEval.pie_ofensivo_salteo || 0;
        acc[playerName].pie_ofensivo_asistencias_total += gkEval.pie_ofensivo_asistencias || 0;

        return acc;
      }, {});

      const goalkeeperStatsForExcel = Object.entries(goalkeeperStats).map(([playerName, stats]: [string, any]) => ({
        'Jugador': playerName,
        'Partidos Jugados': stats.matches,
        'Minutos Jugados': stats.minutes_played,
        'Promedio Minutos por Partido': (stats.minutes_played / stats.matches).toFixed(2),
        'Goles': stats.goals,
        'Tarjetas Amarillas': stats.yellow_cards_total,
        'Tarjetas Rojas': stats.red_cards_total,
        'Calificación General Promedio': (stats.rating_total / stats.matches).toFixed(2),
        'Comunicación - Adecuada (Promedio 1-7)': (stats.comunicacion_adecuada_total / stats.matches).toFixed(2),
        'Comunicación - Preventiva (Promedio 1-7)': (stats.comunicacion_preventiva_total / stats.matches).toFixed(2),
        'Lectura de Juego - Pasiva (Promedio 1-7)': (stats.lectura_pasiva_total / stats.matches).toFixed(2),
        'Lectura de Juego - Activa (Promedio 1-7)': (stats.lectura_activa_total / stats.matches).toFixed(2),
        'Despejes con Puños - Cantidad Total': stats.punos_cantidad_total,
        'Despejes con Puños - Promedio por Partido': (stats.punos_cantidad_total / stats.matches).toFixed(2),
        'Despejes con Puños - Calificación Promedio (1-7)': (stats.punos_calificacion_total / stats.matches).toFixed(2),
        'Descuelgue - Cantidad Total': stats.descuelgue_cantidad_total,
        'Descuelgue - Promedio por Partido': (stats.descuelgue_cantidad_total / stats.matches).toFixed(2),
        'Descuelgue - Calificación Promedio (1-7)': (stats.descuelgue_calificacion_total / stats.matches).toFixed(2),
        'Duelos 1vs1 - Cantidad Total': stats.uno_vs_uno_cantidad_total,
        'Duelos 1vs1 - Promedio por Partido': (stats.uno_vs_uno_cantidad_total / stats.matches).toFixed(2),
        'Duelos 1vs1 - Calificación Promedio (1-7)': (stats.uno_vs_uno_calificacion_total / stats.matches).toFixed(2),
        'Gol Rival (Riesgo Alto) - Cantidad Total': stats.gol_rival_alto_cantidad_total,
        'Gol Rival (Riesgo Alto) - Promedio por Partido': (stats.gol_rival_alto_cantidad_total / stats.matches).toFixed(2),
        'Gol Rival (Riesgo Alto) - Calificación Promedio (1-7)': (stats.gol_rival_alto_calificacion_total / stats.matches).toFixed(2),
        'Gol Rival (Riesgo Medio) - Cantidad Total': stats.gol_rival_medio_cantidad_total,
        'Gol Rival (Riesgo Medio) - Promedio por Partido': (stats.gol_rival_medio_cantidad_total / stats.matches).toFixed(2),
        'Gol Rival (Riesgo Medio) - Calificación Promedio (1-7)': (stats.gol_rival_medio_calificacion_total / stats.matches).toFixed(2),
        'Pie (Defensivo) - Control de Balón (Promedio 1-7)': (stats.pie_defensivo_controles_total / stats.matches).toFixed(2),
        'Pie (Defensivo) - Continuidad en el Juego (Promedio 1-7)': (stats.pie_defensivo_continuidad_total / stats.matches).toFixed(2),
        'Pie (Ofensivo) - Inicio de Jugada (Promedio 1-7)': (stats.pie_ofensivo_inicio_total / stats.matches).toFixed(2),
        'Pie (Ofensivo) - Pases de Salteo (Promedio 1-7)': (stats.pie_ofensivo_salteo_total / stats.matches).toFixed(2),
        'Pie (Ofensivo) - Asistencias (Promedio 1-7)': (stats.pie_ofensivo_asistencias_total / stats.matches).toFixed(2),
        'Posiciones Jugadas': Array.from(stats.positions).join(', '),
      }));

      const wb = XLSX.utils.book_new();
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, "Resumen por Jugador");

      if (goalkeeperStatsForExcel.length > 0) {
        const goalkeeperWs = XLSX.utils.json_to_sheet(goalkeeperStatsForExcel);
        XLSX.utils.book_append_sheet(wb, goalkeeperWs, "Resumen Porteros");
      }

      const fileName = `Estadísticas_Jugadores_${format(new Date(startDate), "dd-MM-yyyy")}_a_${format(new Date(endDate), "dd-MM-yyyy")}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Éxito",
        description: "Resumen Excel descargado correctamente",
      });
    } catch (error) {
      console.error('Error downloading summary:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo descargar el resumen",
      });
    }
  };

  const confirmDelete = async () => {
    if (matchToDelete && onDelete) {
      try {
        await onDelete(matchToDelete);
        toast({
          title: "Éxito",
          description: "Partido eliminado correctamente",
        });
      } catch (error) {
        console.error('Error al eliminar el partido:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo eliminar el partido",
        });
      } finally {
        setShowDeleteDialog(false);
        setMatchToDelete(null);
      }
    }
  };

  const handleLineupClick = (match: Match) => {
    setSelectedMatch(match);
    setShowLineup(true);
  };

  const getPositionLabel = (value: string) => {
    const position = positionOptions.find(pos => pos.value === value);
    return position ? position.label : value;
  };

  return (
    <>
      <div className={`relative bg-gradient-to-br ${getGradientClasses('primary')} border-2 border-border rounded-xl p-6 ${getGradientClasses('hover')} shadow-2xl`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
        <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
        <div className="relative space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-primary-foreground mb-1">
                Desde
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-foreground mb-1">
                Hasta
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border hover:shadow-lg w-full gap-2`}
              >
                <Search className="w-4 h-4 text-primary-foreground" />
                <span className="text-primary-foreground">Buscar</span>
              </Button>
            </div>
          </div>

          {filteredMatches.length > 0 && (
            <div className="flex justify-end mb-4">
              <Button
                onClick={handleDownloadSummary}
                className={`gap-2 relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border hover:shadow-lg`}
              >
                <FileDown className="w-4 h-4 text-primary-foreground" />
                <span className="text-primary-foreground">Descargar Resumen Excel</span>
              </Button>
            </div>
          )}

          <div className="bg-white/10 rounded-lg overflow-hidden backdrop-blur-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-white/20 bg-white/5">
                  <TableHead className="text-primary-foreground font-semibold">Oponente</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Fecha</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Ubicación</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Resultado</TableHead>
                  <TableHead className="w-[200px] text-primary-foreground font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(filteredMatches.length > 0 ? filteredMatches : matches).map((match) => (
                  <TableRow key={match.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-primary-foreground">{match.opponent}</TableCell>
                    <TableCell className="text-primary-foreground">
                      {format(new Date(match.date), "PPP 'a las' p", { locale: es })}
                    </TableCell>
                    <TableCell className="text-primary-foreground">{match.location || "No especificada"}</TableCell>
                    <TableCell className="text-primary-foreground">
                      {match.ohiggins_score !== null && match.opponent_score !== null
                        ? `${match.ohiggins_score} - ${match.opponent_score}`
                        : "No especificado"}
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (isYouthFootball) {
                            onEvaluate?.(match.id);
                          } else {
                            setMatchToEvaluate(match.id);
                            setShowEvaluationOptions(true);
                          }
                        }}
                        className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border text-primary-foreground`}
                      >
                        <ClipboardList className="h-4 w-4 mr-1 text-primary-foreground" />
                        Evaluar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleLineupClick(match)}
                        className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border text-primary-foreground`}
                      >
                        <Users className="h-4 w-4 mr-1 text-primary-foreground" />
                        Alineación
                      </Button>
                      {hasEditPermission && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-primary-foreground hover:bg-white/20">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(match)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(match.id)}
                              className="text-red-600"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {!isYouthFootball && showEvaluationOptions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Seleccionar tipo de evaluación</h3>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => {
                  if (matchToEvaluate) {
                    onEvaluate?.(matchToEvaluate);
                  }
                  setShowEvaluationOptions(false);
                  setMatchToEvaluate(null);
                }}
                className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl p-4 transition-all duration-300 shadow-2xl h-24 transform hover:scale-105`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                <div className="relative flex items-center justify-center h-full text-center">
                  <p className="text-lg font-rajdhani font-semibold text-primary-foreground uppercase tracking-wider">
                    Evaluación de Jugadores
                  </p>
                </div>
                <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              </button>
              
              <button
                onClick={() => {
                  // TODO: Implementar funcionalidad de Wyscout
                  toast({
                    title: "Próximamente",
                    description: "La funcionalidad de Wyscout estará disponible pronto",
                  });
                  setShowEvaluationOptions(false);
                  setMatchToEvaluate(null);
                }}
                className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl p-4 transition-all duration-300 shadow-2xl h-24 transform hover:scale-105`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                <div className="relative flex items-center justify-center h-full text-center">
                  <p className="text-lg font-rajdhani font-semibold text-primary-foreground uppercase tracking-wider">
                    Wyscout
                  </p>
                </div>
                <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              </button>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEvaluationOptions(false);
                  setMatchToEvaluate(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedMatch && (
        <>
          <LineupModal
            isOpen={showLineup}
            onClose={() => {
              setShowLineup(false);
              setSelectedMatch(null);
            }}
            matchId={selectedMatch.id}
            categoryId={selectedMatch.category_id}
          />
          <EditMatchModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedMatch(null);
            }}
            match={selectedMatch}
            onEdit={onEdit}
          />
        </>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El partido será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

