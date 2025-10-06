import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash, FileDown, ArrowRightLeft } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import jsPDF from 'jspdf';
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
import { AddPlayerModal } from "@/components/modals/AddPlayerModal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AddCoachModal } from "@/components/modals/AddCoachModal";
import { useState, useEffect } from "react";
import { DeleteConfirmationDialog } from "@/components/modals/DeleteConfirmationDialog";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";
import { getOrganizationLogo } from '@/config/organizationLogos';

interface Player {
  id: string;
  name: string;
  age?: number;
  height?: string;
  weight?: string;
  position?: string;
  image_url?: string;
  category_id: string;
  jersey_number?: string;
  rut?: string;
  email?: string;
  user_id?: string;
  updated_at?: string;
}

interface Coach {
  id: string;
  name: string;
  age?: string;
  email?: string;
  password?: string;
  image_url?: string;
  category_id: string;
}

interface PlayersListProps {
  players: Player[];
  coaches?: Coach[];
  onEdit: (player: Player) => void;
  onEditCoach?: (coach: Coach) => void;
  onDelete: (id: string) => void;
  onDeleteCoach?: (id: string) => void;
  onTransfer?: (player: Player) => void;
  onTransferCoach?: (coach: Coach) => void;
  showDownloadButton?: boolean;
  onDownload?: (playerId: string) => void;
  onPlayerSelect?: (playerId: string) => void;
  hideActions?: boolean;
  dateFilter?: { startDate?: Date; endDate?: Date };
  evaluations?: any[];
  filterByCategory?: boolean;
}

export function PlayersList({ 
  players,
  coaches = [],
  onEdit, 
  onEditCoach,
  onDelete,
  onDeleteCoach,
  onTransfer,
  onTransferCoach,
  showDownloadButton = true,
  onDownload,
  onPlayerSelect,
  hideActions = false,
  dateFilter,
  evaluations = [],
  filterByCategory = false
}: PlayersListProps) {
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'player' | 'coach'} | null>(null);
  const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);
  const [playerEmail, setPlayerEmail] = useState<string | null>(null);
  const [coachToEdit, setCoachToEdit] = useState<Coach | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { canEdit } = usePermissions();
  const { getGradientClasses, organizationId } = useOrganizationTheme();
  const hasEditPermission = canEdit('football');

  // Fetch player email when a player is selected for editing
  useEffect(() => {
    if (playerToEdit) {
      const fetchPlayerEmail = async () => {
        try {
          // Get the email directly from the player record first
          if (playerToEdit.email) {
            setPlayerEmail(playerToEdit.email);
            return;
          }
          
          // If player doesn't have email in the players table, check if they have a user_id
          if (playerToEdit.user_id) {
            const { data: userData, error } = await supabase
              .from('users')
              .select('email')
              .eq('id', playerToEdit.user_id)
              .single();
              
            if (!error && userData) {
              setPlayerEmail(userData.email);
            }
          }
        } catch (error) {
          console.error('Error fetching player email:', error);
        }
      };
      
      fetchPlayerEmail();
    } else {
      setPlayerEmail(null);
    }
  }, [playerToEdit]);

  const handleDownloadPlayerHistory = async (player: Player) => {
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4"
      });

      // Helper para cargar imágenes preservando transparencia
      const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

      const logoSrc = getOrganizationLogo(organizationId);
      const processLogo = async (src: string) => {
        const img = await loadImage(src);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return src;
        ctx.drawImage(img, 0, 0);
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imageData.data;
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
            // Si el pixel es muy claro (casi blanco) y semi-transparente, hazlo totalmente transparente para evitar halo
            if (a < 40 && r > 235 && g > 235 && b > 235) {
              d[i+3] = 0;
            }
          }
          ctx.putImageData(imageData, 0, 0);
          return canvas.toDataURL('image/png');
        } catch {
          return src;
        }
      };

      const logoCleaned = await processLogo(logoSrc);
      const logoDataUrl = await (async () => { const res = await fetch(logoSrc, { mode: 'cors' }); const blob = await res.blob(); return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(blob); }); })();

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // FONDO ELEGANTE CON GRADIENTE PROFESIONAL
      // Fondo blanco base
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Banda lateral izquierda (azul corporativo)
      pdf.setFillColor(25, 47, 89);
      pdf.rect(0, 0, 8, pageHeight, 'F');

      // HEADER PROFESIONAL
      const headerHeight = 100;
      
      // Fondo del header (gradiente azul corporativo simulado)
      pdf.setFillColor(25, 47, 89);
      pdf.rect(0, 0, pageWidth, headerHeight, 'F');
      
      // Línea dorada de acento
      pdf.setFillColor(218, 165, 32);
      pdf.rect(0, headerHeight - 4, pageWidth, 4, 'F');

      // LOGO Y TÍTULO PRINCIPAL
      const logoSize = 60;
      pdf.addImage( logoCleaned, "PNG", 40, 20, logoSize, logoSize);

      // Título corporativo
      pdf.setFont("helvetica", "light");
      pdf.setFontSize(28);
      pdf.setTextColor(255, 255, 255);
      pdf.text("FICHA TÉCNICA", 120, 35);
      
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(32);
      pdf.text("JUGADOR", 120, 65);

      // Línea decorativa
      pdf.setDrawColor(218, 165, 32);
      pdf.setLineWidth(2);
      pdf.line(120, 75, 320, 75);

      // INFORMACIÓN DEL JUGADOR
      const contentStartY = 140;
      
      // Calcular espacio para la foto del lado derecho
      const photoWidth = 140;
      const photoHeight = 180;
      const photoX = pageWidth - photoWidth - 40;
      const photoY = contentStartY + 20;
      const contentWidth = photoX - 80; // Espacio disponible para contenido
      
      // SECCIÓN NOMBRE DEL JUGADOR (lado izquierdo, sin ocupar el espacio de la foto)
      pdf.setFillColor(248, 249, 250);
      pdf.rect(40, contentStartY, contentWidth, 80, 'F');
      
      // Borde sutil
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(1);
      pdf.rect(40, contentStartY, contentWidth, 80, 'S');

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.setTextColor(107, 114, 128);
      pdf.text("NOMBRE COMPLETO", 60, contentStartY + 20);
      
      // Nombre del jugador con tamaño reducido y multilinea si es necesario
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18); // Reducido de 24 a 18
      pdf.setTextColor(17, 24, 39);
      const playerName = player.name.toUpperCase();
      const maxNameWidth = contentWidth - 40;
      
      // Dividir el nombre si es muy largo
      const nameLines = pdf.splitTextToSize(playerName, maxNameWidth);
      if (Array.isArray(nameLines)) {
        nameLines.forEach((line: string, index: number) => {
          pdf.text(line, 60, contentStartY + 45 + (index * 20));
        });
      } else {
        pdf.text(nameLines, 60, contentStartY + 45);
      }

      // FOTO DEL JUGADOR (lado derecho)
      if (player.image_url) {
        // Marco para la foto
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(photoX, photoY, photoWidth, photoHeight, 8, 8, 'F');
        
        // Borde elegante
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(2);
        pdf.roundedRect(photoX, photoY, photoWidth, photoHeight, 8, 8, 'S');

        try {
          // Imagen del jugador con padding
          const imagePadding = 8;
          pdf.addImage(
            player.image_url,
            "PNG",
            photoX + imagePadding,
            photoY + imagePadding,
            photoWidth - (imagePadding * 2),
            photoHeight - (imagePadding * 2)
          );
        } catch (imageError) {
          console.error('Error adding player image:', imageError);
          // Placeholder elegante
          pdf.setFontSize(10);
          pdf.setTextColor(156, 163, 175);
          pdf.text("Foto no", photoX + photoWidth / 2, photoY + photoHeight / 2 - 5, { align: 'center' });
          pdf.text("disponible", photoX + photoWidth / 2, photoY + photoHeight / 2 + 10, { align: 'center' });
        }
      }

      // GRID DE INFORMACIÓN PROFESIONAL
      const gridStartY = contentStartY + 120;
      const leftColumnX = 60;
      const rightColumnX = photoX / 2 + 30;
      const columnWidth = (contentWidth - 40) / 2;

      // Función para crear una card de información profesional
      const createInfoCard = (x: number, y: number, label: string, value: string, isHighlight = false) => {
        const cardHeight = 50; // Aumentado ligeramente para mejor proporción
        
        // Fondo de la card con gradiente simulado para mayor profesionalismo
        if (isHighlight) {
          // Fondo azul corporativo con gradiente sutil
          pdf.setFillColor(25, 47, 89);
          pdf.roundedRect(x, y, columnWidth, cardHeight, 6, 6, 'F');
          
          // Sombra sutil para efecto profesional
          pdf.setFillColor(15, 37, 79);
          pdf.roundedRect(x + 2, y + 2, columnWidth, cardHeight, 6, 6, 'F');
          pdf.setFillColor(25, 47, 89);
          pdf.roundedRect(x, y, columnWidth, cardHeight, 6, 6, 'F');
        } else {
          // Fondo blanco con sombra sutil
          pdf.setFillColor(248, 250, 252);
          pdf.roundedRect(x, y, columnWidth, cardHeight, 6, 6, 'F');
        }
        
        // Borde más elegante y definido
        if (isHighlight) {
          pdf.setDrawColor(37, 59, 101);
          pdf.setLineWidth(1);
        } else {
          pdf.setDrawColor(203, 213, 225);
          pdf.setLineWidth(0.8);
        }
        pdf.roundedRect(x, y, columnWidth, cardHeight, 6, 6, 'S');
        
        // Etiqueta con tipografía más profesional
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8); // Reducido para más profesionalismo
        if (isHighlight) {
          pdf.setTextColor(220, 230, 255); // Azul claro para contraste
        } else {
          pdf.setTextColor(100, 116, 139); // Gris más profesional
        }
        pdf.text(label, x + 18, y + 18);
        
        // Valor con mejor jerarquía visual
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12); // Reducido de 14 a 12 para consistencia
        if (isHighlight) {
          pdf.setTextColor(255, 255, 255);
        } else {
          pdf.setTextColor(30, 41, 59); // Negro más suave y profesional
        }
        pdf.text(value, x + 18, y + 38);
      };

      // Cards de información ajustadas para incluir lesiones y enfermedades
      let cardY = gridStartY;
      const cardSpacing = 55; // Reducido ligeramente para mejor distribución

      // Obtener el conteo total de lesiones del jugador
      const { data: injuryRecords = [] } = await supabase
        .from("injury_records")
        .select("id")
        .eq("player_id", player.id);

      const totalInjuries = injuryRecords ? injuryRecords.length : 0;

      // Obtener el conteo total de enfermedades/malestares del jugador
      const { data: ailmentRecords = [] } = await supabase
        .from("ailments")
        .select("id")
        .eq("player_id", player.id);

      const totalAilments = ailmentRecords ? ailmentRecords.length : 0;

      createInfoCard(leftColumnX, cardY, "NÚMERO DE CAMISETA", player.jersey_number || 'No asignado', true);
      createInfoCard(rightColumnX, cardY, "EDAD", `${player.age || 'No especificada'} años`, true);

      cardY += cardSpacing;
      createInfoCard(leftColumnX, cardY, "ALTURA", player.height || 'No especificada', true);
      createInfoCard(rightColumnX, cardY, "PESO", player.weight || 'No especificado', true);

      cardY += cardSpacing;
      createInfoCard(leftColumnX, cardY, "POSICIÓN", getPositionLabel(player.position || ''), true);
      createInfoCard(rightColumnX, cardY, "TOTAL LESIONES", `${totalInjuries} registro${totalInjuries !== 1 ? 's' : ''}`, true);
      
      cardY += cardSpacing;
      if (player.rut) {
        createInfoCard(leftColumnX, cardY, "RUT", player.rut);
      }
      createInfoCard(rightColumnX, cardY, "TOTAL ENFERMEDADES", `${totalAilments} registro${totalAilments !== 1 ? 's' : ''}`, true);

      // Obtener estadísticas de fútbol del jugador desde match_statistics
      let matchQuery = supabase
        .from("match_statistics")
        .select(`
          *,
          matches!inner (
            date,
            opponent,
            category_id
          )
        `)
        .eq("player_id", player.id);

      // Solo filtrar por categoría si filterByCategory es true
      if (filterByCategory) {
        matchQuery = matchQuery.eq("matches.category_id", player.category_id);
      }

      // Aplicar filtro de fechas si está disponible
      if (dateFilter?.startDate && dateFilter?.endDate) {
        const startDateStr = dateFilter.startDate.toISOString().split('T')[0];
        const endDateStr = dateFilter.endDate.toISOString().split('T')[0];
        matchQuery = matchQuery
          .gte("matches.date", startDateStr + 'T00:00:00.000Z')
          .lte("matches.date", endDateStr + 'T23:59:59.999Z');
      }

      const { data: matchStats, error: statsError } = await matchQuery;

      // Obtener datos de wellness del jugador para el PDF
      let wellnessQuery = supabase
        .from("wellness_responses")
        .select("sleep_quality, muscle_soreness, fatigue_level, stress_level")
        .eq("player_id", player.id);

      // Aplicar filtro de fechas a wellness si está disponible
      if (dateFilter?.startDate && dateFilter?.endDate) {
        const startDateStr = dateFilter.startDate.toISOString().split('T')[0];
        const endDateStr = dateFilter.endDate.toISOString().split('T')[0];
        wellnessQuery = wellnessQuery
          .gte("created_at", startDateStr)
          .lte("created_at", endDateStr);
      }

      const { data: wellnessData = [] } = await wellnessQuery;

      // Obtener datos de dolor corporal del jugador para el PDF
      let bodyPainQuery = supabase
        .from("body_pain_responses")
        .select("body_part, pain_level")
        .eq("player_id", player.id);

      // Aplicar filtro de fechas a dolor corporal si está disponible
      if (dateFilter?.startDate && dateFilter?.endDate) {
        const startDateStr = dateFilter.startDate.toISOString().split('T')[0];
        const endDateStr = dateFilter.endDate.toISOString().split('T')[0];
        bodyPainQuery = bodyPainQuery
          .gte("created_at", startDateStr)
          .lte("created_at", endDateStr);
      }

      const { data: bodyPainData = [] } = await bodyPainQuery;

      // Obtener datos de RPE del jugador para el PDF
      let rpeQuery = supabase
        .from("rpe_responses")
        .select("rpe_score, internal_load")
        .eq("player_id", player.id);

      // Aplicar filtro de fechas a RPE si está disponible
      if (dateFilter?.startDate && dateFilter?.endDate) {
        const startDateStr = dateFilter.startDate.toISOString().split('T')[0];
        const endDateStr = dateFilter.endDate.toISOString().split('T')[0];
        rpeQuery = rpeQuery
          .gte("created_at", startDateStr)
          .lte("created_at", endDateStr);
      }

      const { data: rpeData = [] } = await rpeQuery;

      // SECCIÓN DE ESTADÍSTICAS DE FÚTBOL
      const evaluationsSectionY = gridStartY + (cardSpacing * 4) + 30;

      if (!statsError && matchStats && matchStats.length > 0) {
        // Título de sección
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.setTextColor(25, 47, 89);
        pdf.text("ESTADÍSTICAS DE FÚTBOL", 60, evaluationsSectionY);
        
        // Línea decorativa bajo el título
        pdf.setDrawColor(218, 165, 32);
        pdf.setLineWidth(2);
        pdf.line(60, evaluationsSectionY + 5, 260, evaluationsSectionY + 5);

        // Calcular estadísticas agregadas
        const totalMatches = matchStats.length;
        
        // Posiciones jugadas
        const positionCounts = matchStats.reduce((acc, stat) => {
          const position = stat.match_position || 'Sin posición';
          acc[position] = (acc[position] || 0) + 1;
          return acc;
        }, {});
        
        // Minutos jugados
        const totalMinutes = matchStats.reduce((sum, stat) => sum + (stat.minutes_played || 0), 0);
        const averageMinutes = totalMinutes / totalMatches;
        
        // Tarjetas
        const totalYellowCards = matchStats.reduce((sum, stat) => sum + (stat.yellow_cards || 0), 0);
        const totalRedCards = matchStats.reduce((sum, stat) => sum + (stat.red_cards || 0), 0);
        
        // Goles
        const totalGoals = matchStats.reduce((sum, stat) => sum + (stat.goals || 0), 0);
        const averageGoals = totalGoals / totalMatches;
        
        // Tipos de gol
        const goalTypes = matchStats.flatMap(stat => 
          Array.isArray(stat.goal_types) ? stat.goal_types.map((gt: any) => gt.type) : []
        );
        const goalTypeCounts = goalTypes.reduce((acc, type) => {
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});
        
        // Asistencias
        const totalAssists = matchStats.reduce((sum, stat) => sum + (stat.assists || 0), 0);
        
        // Calificación promedio
        const ratingsSum = matchStats.reduce((sum, stat) => sum + (stat.rating || 0), 0);
        const averageRating = ratingsSum / totalMatches;

        let evalY = evaluationsSectionY + 30;
        const evalSpacing = 18;
        const leftColumnX = 60;
        const rightColumnX = pageWidth / 2 + 30;
        const textPadding = 8;
        const cardHeight = 14;

        // Verificar espacio disponible en la página
        const maxY = pageHeight - 50; // Margen inferior más conservador
        
        // Función para dibujar rectángulo de fondo azul para estadística
        const drawStatBox = (x: number, y: number, text: string) => {
          // Calcular ancho del texto para que el rectángulo lo abarque completamente
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          const textWidth = pdf.getTextWidth(text);
          const boxWidth = textWidth + (textPadding * 2);
          
          // Fondo azul profesional similar al header
          pdf.setFillColor(25, 47, 89); // Azul corporativo
          pdf.roundedRect(x - textPadding, y - 10, boxWidth, cardHeight, 3, 3, 'F');
          
          // Borde azul más oscuro para profundidad
          pdf.setDrawColor(15, 37, 79);
          pdf.setLineWidth(0.8);
          pdf.roundedRect(x - textPadding, y - 10, boxWidth, cardHeight, 3, 3, 'S');
          
          // Texto en blanco para contraste
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.setTextColor(255, 255, 255);
          pdf.text(text, x, y);
        };

        // Función para dibujar rectángulo de fondo azul para wellness/médico
        const drawWellnessBox = (x: number, y: number, text: string) => {
          // Calcular ancho del texto para que el rectángulo lo abarque completamente
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          const textWidth = pdf.getTextWidth(text);
          const boxWidth = textWidth + (textPadding * 2);
          
          // Fondo azul profesional similar al header
          pdf.setFillColor(25, 47, 89); // Azul corporativo
          pdf.roundedRect(x - textPadding, y - 10, boxWidth, cardHeight, 3, 3, 'F');
          
          // Borde azul más oscuro para profundidad
          pdf.setDrawColor(15, 37, 79);
          pdf.setLineWidth(0.8);
          pdf.roundedRect(x - textPadding, y - 10, boxWidth, cardHeight, 3, 3, 'S');
          
          // Texto en blanco para contraste
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(255, 255, 255);
          pdf.text(text, x, y);
        };

        // Estadísticas principales con rectángulos azules
        const statsData = [
          { text: `PARTIDOS JUGADOS: ${totalMatches}`, column: 'left' },
          { text: `MINUTOS TOTALES: ${totalMinutes}`, column: 'left' },
          { text: `PROMEDIO MINUTOS: ${averageMinutes.toFixed(1)}`, column: 'left' },
          { text: `GOLES TOTALES: ${totalGoals}`, column: 'left' },
          { text: `PROMEDIO GOLES: ${averageGoals.toFixed(2)}`, column: 'left' },
          { text: `ASISTENCIAS: ${totalAssists}`, column: 'left' },
          { text: `TARJETAS AMARILLAS: ${totalYellowCards}`, column: 'right' },
          { text: `TARJETAS ROJAS: ${totalRedCards}`, column: 'right' },
          { text: `CALIFICACIÓN: ${averageRating.toFixed(1)}/7`, column: 'right' }
        ];

        // Dividir estadísticas en columnas
        const leftStats = statsData.filter(stat => stat.column === 'left');
        const rightStats = statsData.filter(stat => stat.column === 'right');
        
        // Columna izquierda
        let leftY = evalY;
        leftStats.forEach((stat, index) => {
          if (leftY < maxY - 20) {
            drawStatBox(leftColumnX, leftY, stat.text);
            leftY += evalSpacing;
          }
        });
        
        // Columna derecha
        let rightY = evalY;
        rightStats.forEach((stat, index) => {
          if (rightY < maxY - 20) {
            drawStatBox(rightColumnX, rightY, stat.text);
            rightY += evalSpacing;
          }
        });
        
        // Posiciones jugadas con rectángulos azules
        const finalY = Math.max(leftY, rightY);
        evalY = finalY + 10;
        
        // Verificar que hay espacio para la sección de posiciones
        if (evalY < maxY - 50) {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(25, 47, 89);
          pdf.text("POSICIONES JUGADAS:", leftColumnX, evalY);
          evalY += 15;
          
          Object.entries(positionCounts).forEach(([position, count]) => {
            if (evalY < maxY - 15) {
              const positionLabel = getPositionLabel(position);
              const matchCount = count as number;
              const positionText = `${positionLabel}: ${matchCount} partido${matchCount > 1 ? 's' : ''}`;
              
              // Calcular ancho del texto
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(9);
              const textWidth = pdf.getTextWidth(positionText);
              const boxWidth = textWidth + 16;
              
              // Rectángulo azul para cada posición
              pdf.setFillColor(25, 47, 89);
              pdf.roundedRect(leftColumnX + 10 - 8, evalY - 10, boxWidth, 12, 2, 2, 'F');
              
              pdf.setDrawColor(15, 37, 79);
              pdf.setLineWidth(0.8);
              pdf.roundedRect(leftColumnX + 10 - 8, evalY - 10, boxWidth, 12, 2, 2, 'S');
              
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(9);
              pdf.setTextColor(255, 255, 255);
              pdf.text(positionText, leftColumnX + 10, evalY);
              evalY += 14;
            }
          });
        }
        
        // Tipos de gol con rectángulos azules (si hay y hay espacio)
        if (Object.keys(goalTypeCounts).length > 0 && evalY < maxY - 40) {
          evalY += 8;
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(25, 47, 89);
          pdf.text("TIPOS DE GOL:", leftColumnX, evalY);
          evalY += 15;
          
          const goalTypeLabels = {
            header: "De cabeza",
            penalty: "De penal", 
            outside_box: "Fuera del área con pie",
            inside_box: "Dentro del área con pie"
          };
          
          Object.entries(goalTypeCounts).forEach(([type, count]) => {
            if (evalY < maxY - 15) {
              const typeLabel = goalTypeLabels[type as keyof typeof goalTypeLabels] || type;
              const goalCount = count as number;
              const goalText = `${typeLabel}: ${goalCount}`;
              
              // Calcular ancho del texto
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(9);
              const textWidth = pdf.getTextWidth(goalText);
              const boxWidth = textWidth + 16;
              
              // Rectángulo azul para cada tipo de gol
              pdf.setFillColor(25, 47, 89);
              pdf.roundedRect(leftColumnX + 10 - 8, evalY - 10, boxWidth, 12, 2, 2, 'F');
              
              pdf.setDrawColor(15, 37, 79);
              pdf.setLineWidth(0.8);
              pdf.roundedRect(leftColumnX + 10 - 8, evalY - 10, boxWidth, 12, 2, 2, 'S');
              
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(9);
              pdf.setTextColor(255, 255, 255);
              pdf.text(goalText, leftColumnX + 10, evalY);
              evalY += 14;
            }
          });
        }

        // Estadísticas específicas de porteros
        const goalkeeperStats = matchStats.filter(stat => 
          stat.match_position === 'portero' && stat.goalkeeper_evaluation
        );
        
        if (goalkeeperStats.length > 0) {
          // Agregar nueva página para estadísticas de portero
          pdf.addPage();
          
          // Recrear header en nueva página
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          
          // FONDO ELEGANTE CON GRADIENTE PROFESIONAL
          // Fondo blanco base
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');

          // Banda lateral izquierda (azul corporativo)
          pdf.setFillColor(25, 47, 89);
          pdf.rect(0, 0, 8, pageHeight, 'F');

          // HEADER PROFESIONAL
          const headerHeight = 100;
          
          // Fondo del header (gradiente azul corporativo simulado)
          pdf.setFillColor(25, 47, 89);
          pdf.rect(0, 0, pageWidth, headerHeight, 'F');
          
          // Línea dorada de acento
          pdf.setFillColor(218, 165, 32);
          pdf.rect(0, headerHeight - 4, pageWidth, 4, 'F');

          // LOGO Y TÍTULO PRINCIPAL
          const logoSize = 60;
          pdf.addImage( logoCleaned, "PNG", 40, 20, logoSize, logoSize);

          // Título corporativo
          pdf.setFont("helvetica", "light");
          pdf.setFontSize(28);
          pdf.setTextColor(255, 255, 255);
          pdf.text("ESTADÍSTICAS DE", 120, 35);
          
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(32);
          pdf.text("PORTERO", 120, 65);

          // Línea decorativa
          pdf.setDrawColor(218, 165, 32);
          pdf.setLineWidth(2);
          pdf.line(120, 75, 320, 75);
          
          // Nombre del jugador en la nueva página
          const contentStartY = 140;
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(20);
          pdf.setTextColor(17, 24, 39);
          pdf.text(player.name.toUpperCase(), 60, contentStartY);
          
          evalY = contentStartY + 40;
          
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(16);
          pdf.setTextColor(25, 47, 89);
          pdf.text("ESTADÍSTICAS ESPECÍFICAS DE PORTERO", 60, evalY);
          
          // Línea decorativa
          pdf.setDrawColor(218, 165, 32);
          pdf.setLineWidth(2);
          pdf.line(60, evalY + 5, 260, evalY + 5);
          
          evalY += 35;

          // Calcular promedios de las variables de portero
          const gkData = goalkeeperStats.map(stat => stat.goalkeeper_evaluation);
          const gkCount = gkData.length;

          const calculateAverage = (field: string) => {
            const sum = gkData.reduce((acc, gk) => acc + (gk?.[field] || 0), 0);
            return sum / gkCount;
          };

          const calculateTotal = (field: string) => {
            return gkData.reduce((acc, gk) => acc + (gk?.[field] || 0), 0);
          };

          // Función para dibujar rectángulo de fondo azul para estadísticas de portero
          const drawWellnessBox = (x: number, y: number, text: string) => {
            // Calcular ancho del texto para que el rectángulo lo abarque completamente
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
            const textWidth = pdf.getTextWidth(text);
            const boxWidth = textWidth + 16; // Padding horizontal
            const boxHeight = 12; // Altura fija

            // Dibujar rectángulo de fondo azul corporativo (mismo que estadísticas de fútbol)
            pdf.setFillColor(25, 47, 89); // Azul corporativo
            pdf.roundedRect(x - 5, y - 8, boxWidth, boxHeight, 2, 2, 'F');

            // Texto en blanco sobre el fondo azul
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
            pdf.setTextColor(255, 255, 255);
            pdf.text(text, x, y);
          };

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(17, 24, 39);

          // Comunicación
          const comunicacionSection = evalY;
          pdf.text("COMUNICACIÓN:", leftColumnX, evalY);
          evalY += 15;
          drawWellnessBox(leftColumnX + 10, evalY, `Adecuada: ${calculateAverage('comunicacion_adecuada').toFixed(1)}/7`);
          evalY += 18;
          drawWellnessBox(leftColumnX + 10, evalY, `Preventiva: ${calculateAverage('comunicacion_preventiva').toFixed(1)}/7`);
          evalY += 25;

          // Lectura de juego
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(17, 24, 39);
          pdf.text("LECTURA DE JUEGO:", leftColumnX, evalY);
          evalY += 15;
          drawWellnessBox(leftColumnX + 10, evalY, `Pasiva: ${calculateAverage('lectura_pasiva').toFixed(1)}/7`);
          evalY += 18;
          drawWellnessBox(leftColumnX + 10, evalY, `Activa: ${calculateAverage('lectura_activa').toFixed(1)}/7`);
          evalY += 25;

          // Juego aéreo - Columna derecha
          let rightEvalY = comunicacionSection;
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(17, 24, 39);
          pdf.text("JUEGO AÉREO:", rightColumnX, rightEvalY);
          rightEvalY += 15;
          drawWellnessBox(rightColumnX + 10, rightEvalY, `Puños - Cantidad: ${calculateAverage('punos_cantidad').toFixed(1)}`);
          rightEvalY += 18;
          drawWellnessBox(rightColumnX + 10, rightEvalY, `Puños - Cantidad Total: ${calculateTotal('punos_cantidad')}`);
          rightEvalY += 18;
          drawWellnessBox(rightColumnX + 10, rightEvalY, `Puños - Calificación: ${calculateAverage('punos_calificacion').toFixed(1)}/7`);
          rightEvalY += 18;
          drawWellnessBox(rightColumnX + 10, rightEvalY, `Descuelgue - Cantidad: ${calculateAverage('descuelgue_cantidad').toFixed(1)}`);
          rightEvalY += 18;
          drawWellnessBox(rightColumnX + 10, rightEvalY, `Descuelgue - Cantidad Total: ${calculateTotal('descuelgue_cantidad')}`);
          rightEvalY += 18;
          drawWellnessBox(rightColumnX + 10, rightEvalY, `Descuelgue - Calificación: ${calculateAverage('descuelgue_calificacion').toFixed(1)}/7`);
          rightEvalY += 25;

          // Acciones 1 vs 1
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(17, 24, 39);
          pdf.text("ACCIONES 1 VS 1:", rightColumnX, rightEvalY);
          rightEvalY += 15;
          drawWellnessBox(rightColumnX + 10, rightEvalY, `Cantidad: ${calculateAverage('uno_vs_uno_cantidad').toFixed(1)}`);
          rightEvalY += 18;
          drawWellnessBox(rightColumnX + 10, rightEvalY, `Cantidad Total: ${calculateTotal('uno_vs_uno_cantidad')}`);
          rightEvalY += 18;
          drawWellnessBox(rightColumnX + 10, rightEvalY, `Calificación: ${calculateAverage('uno_vs_uno_calificacion').toFixed(1)}/7`);

          // Opciones de gol rival
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(17, 24, 39);
          pdf.text("OPCIONES DE GOL RIVAL (ALTO RIESGO):", leftColumnX, evalY);
          evalY += 15;
          drawWellnessBox(leftColumnX + 10, evalY, `Cantidad: ${calculateAverage('gol_rival_alto_cantidad').toFixed(1)}`);
          evalY += 18;
          drawWellnessBox(leftColumnX + 10, evalY, `Cantidad Total: ${calculateTotal('gol_rival_alto_cantidad')}`);
          evalY += 18;
          drawWellnessBox(leftColumnX + 10, evalY, `Calificación: ${calculateAverage('gol_rival_alto_calificacion').toFixed(1)}/7`);
          evalY += 25;

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(17, 24, 39);
          pdf.text("OPCIONES DE GOL RIVAL (MEDIO RIESGO):", leftColumnX, evalY);
          evalY += 15;
          drawWellnessBox(leftColumnX + 10, evalY, `Cantidad: ${calculateAverage('gol_rival_medio_cantidad').toFixed(1)}`);
          evalY += 18;
          drawWellnessBox(leftColumnX + 10, evalY, `Cantidad Total: ${calculateTotal('gol_rival_medio_cantidad')}`);
          evalY += 18;
          drawWellnessBox(leftColumnX + 10, evalY, `Calificación: ${calculateAverage('gol_rival_medio_calificacion').toFixed(1)}/7`);
          evalY += 25;

          // Pie - usar la columna derecha continuando
          rightEvalY += 30;
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(17, 24, 39);
          pdf.text("PIE - DEFENSIVAS:", rightColumnX, rightEvalY);
          rightEvalY += 15;
          drawWellnessBox(rightColumnX + 10, rightEvalY, `Controles: ${calculateAverage('pie_defensivo_controles').toFixed(1)}/7`);
          rightEvalY += 18;
          drawWellnessBox(rightColumnX + 10, rightEvalY, `Continuidad: ${calculateAverage('pie_defensivo_continuidad').toFixed(1)}/7`);
          rightEvalY += 25;

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(17, 24, 39);
          pdf.text("PIE - OFENSIVAS:", rightColumnX, rightEvalY);
          rightEvalY += 15;
          drawWellnessBox(rightColumnX + 10, rightEvalY, `Inicio: ${calculateAverage('pie_ofensivo_inicio').toFixed(1)}/7`);
          rightEvalY += 18;
          drawWellnessBox(rightColumnX + 10, rightEvalY, `Salteo: ${calculateAverage('pie_ofensivo_salteo').toFixed(1)}/7`);
          rightEvalY += 18;
          drawWellnessBox(rightColumnX + 10, rightEvalY, `Asistencias: ${calculateAverage('pie_ofensivo_asistencias').toFixed(1)}/7`);
        }
      }

      // Estadísticas de Wellness del jugador individual
      if (wellnessData && wellnessData.length > 0) {
        // Agregar nueva página para estadísticas de wellness
        pdf.addPage();
        
        // Recrear header en nueva página
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // FONDO ELEGANTE CON GRADIENTE PROFESIONAL
        // Fondo blanco base
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Banda lateral izquierda (azul corporativo)
        pdf.setFillColor(25, 47, 89);
        pdf.rect(0, 0, 8, pageHeight, 'F');

        // HEADER PROFESIONAL
        const headerHeight = 100;
        
        // Fondo del header (gradiente azul corporativo simulado)
        pdf.setFillColor(25, 47, 89);
        pdf.rect(0, 0, pageWidth, headerHeight, 'F');
        
        // Línea dorada de acento
        pdf.setFillColor(218, 165, 32);
        pdf.rect(0, headerHeight - 4, pageWidth, 4, 'F');

        // LOGO Y TÍTULO PRINCIPAL
        const logoSize = 60;
        pdf.addImage( logoCleaned, "PNG",
          40,
          20,
          logoSize,
          logoSize
        );

        // Título corporativo
        pdf.setFont("helvetica", "light");
        pdf.setFontSize(28);
        pdf.setTextColor(255, 255, 255);
        pdf.text("PARTE MÉDICO", 120, 35);
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(32);
        pdf.text("PERSONAL", 120, 65);

        // Línea decorativa
        pdf.setDrawColor(218, 165, 32);
        pdf.setLineWidth(2);
        pdf.line(120, 75, 320, 75);
        
        // Nombre del jugador en la nueva página
        const contentStartY = 140;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(20);
        pdf.setTextColor(17, 24, 39);
        pdf.text(player.name.toUpperCase(), 60, contentStartY);
        
        let evalY = contentStartY + 40;
        
        // Título de la sección
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.setTextColor(25, 47, 89);
        pdf.text("PROMEDIOS DE WELLNESS INDIVIDUALES", 60, evalY);
        
        // Línea decorativa bajo el título
        pdf.setDrawColor(218, 165, 32);
        pdf.setLineWidth(2);
        pdf.line(60, evalY + 5, 360, evalY + 5);
        
        evalY += 35;

        // Calcular promedios de las variables de wellness
        const wellnessCount = wellnessData.length;

        const calculateWellnessAverage = (field: string) => {
          const sum = wellnessData.reduce((acc, response) => acc + (response[field] || 0), 0);
          return wellnessCount > 0 ? sum / wellnessCount : 0;
        };

        // Función para dibujar rectángulo de fondo azul para wellness/médico
        const drawWellnessBox = (x: number, y: number, text: string) => {
          // Calcular ancho del texto para que el rectángulo lo abarque completamente
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          const textWidth = pdf.getTextWidth(text);
          const wellnessPadding = 8;
          const wellnessCardHeight = 14;
          const boxWidth = textWidth + (wellnessPadding * 2);
          
          // Fondo azul profesional similar al header
          pdf.setFillColor(25, 47, 89); // Azul corporativo
          pdf.roundedRect(x - wellnessPadding, y - 10, boxWidth, wellnessCardHeight, 3, 3, 'F');
          
          // Borde azul más oscuro para profundidad
          pdf.setDrawColor(15, 37, 79);
          pdf.setLineWidth(0.8);
          pdf.roundedRect(x - wellnessPadding, y - 10, boxWidth, wellnessCardHeight, 3, 3, 'S');
          
          // Texto en blanco para contraste
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(255, 255, 255);
          pdf.text(text, x, y);
        };

        // Mostrar estadísticas de wellness en dos columnas
        const leftColumnX = 60;
        const rightColumnX = pageWidth / 2 - 20;
        let leftEvalY = evalY;
        let rightEvalY = evalY;
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(17, 24, 39);
        
        // Columna izquierda
        pdf.text("CALIDAD DEL SUEÑO:", leftColumnX, leftEvalY);
        leftEvalY += 15;
        drawWellnessBox(leftColumnX + 10, leftEvalY, `Promedio: ${calculateWellnessAverage('sleep_quality').toFixed(2)}/10`);
        leftEvalY += 20;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(17, 24, 39);
        pdf.text("DOLORES MUSCULARES:", leftColumnX, leftEvalY);
        leftEvalY += 15;
        drawWellnessBox(leftColumnX + 10, leftEvalY, `Promedio: ${calculateWellnessAverage('muscle_soreness').toFixed(2)}/10`);

        // Columna derecha
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(17, 24, 39);
        pdf.text("NIVEL DE FATIGA:", rightColumnX, rightEvalY);
        rightEvalY += 15;
        drawWellnessBox(rightColumnX + 10, rightEvalY, `Promedio: ${calculateWellnessAverage('fatigue_level').toFixed(2)}/10`);
        rightEvalY += 20;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(17, 24, 39);
        pdf.text("NIVEL DE ESTRÉS:", rightColumnX, rightEvalY);
        rightEvalY += 15;
        drawWellnessBox(rightColumnX + 10, rightEvalY, `Promedio: ${calculateWellnessAverage('stress_level').toFixed(2)}/10`);

        // Información adicional
        evalY = Math.max(leftEvalY, rightEvalY) + 40;
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(17, 24, 39);
        pdf.text(`TOTAL DE RESPUESTAS WELLNESS: ${wellnessCount}`, leftColumnX, evalY);
        
        evalY += 20;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128);
        pdf.text("* Escala del 1 al 10 (1 = Muy malo, 10 = Excelente)", leftColumnX, evalY);
        evalY += 12;
        pdf.text("* Los datos corresponden al promedio individual del jugador", leftColumnX, evalY);
        
        // Agregar estadísticas de dolor corporal si hay datos
        if (bodyPainData && bodyPainData.length > 0) {
          evalY += 50;
          
          // Título de la sección de dolor corporal
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(16);
          pdf.setTextColor(25, 47, 89);
          pdf.text("ESTADÍSTICAS DE MOLESTIA MUSCULAR", 60, evalY);
          
          // Línea decorativa bajo el título
          pdf.setDrawColor(218, 165, 32);
          pdf.setLineWidth(2);
          pdf.line(60, evalY + 5, 360, evalY + 5);
          
          evalY += 35;

          // Agrupar por parte del cuerpo y contar ocurrencias
          const bodyPartCounts = bodyPainData.reduce((acc, response) => {
            const bodyPart = response.body_part;
            acc[bodyPart] = (acc[bodyPart] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          // Ordenar por cantidad (mayor a menor)
          const sortedBodyParts = Object.entries(bodyPartCounts)
            .sort(([,a], [,b]) => b - a);

          const totalBodyPainResponses = bodyPainData.length;
          
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(17, 24, 39);
          pdf.text(`TOTAL DE RESPUESTAS DE DOLOR: ${totalBodyPainResponses}`, leftColumnX, evalY);
          
          evalY += 25;
          
          // Mostrar estadísticas por parte del cuerpo
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(12);
          pdf.setTextColor(25, 47, 89);
          pdf.text("MOLESTIAS POR MÚSCULO/PARTE DEL CUERPO:", leftColumnX, evalY);
          evalY += 20;
          
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(17, 24, 39);
          
          sortedBodyParts.forEach(([bodyPart, count]) => {
            drawWellnessBox(leftColumnX + 10, evalY, `${bodyPart}: ${count} registro${count > 1 ? 's' : ''}`);
            evalY += 18; // Aumentar espacio para los rectángulos
          });
          
          // Información adicional sobre la escala
          evalY += 15;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(107, 114, 128);
          pdf.text("* Escala del 1 al 10 (1 = Sin dolor, 10 = Dolor extremo)", leftColumnX, evalY);
          evalY += 12;
          pdf.text("* Los datos muestran la cantidad de registros por músculo/parte del cuerpo", leftColumnX, evalY);
        }
        
        // Agregar estadísticas de RPE si hay datos
        if (rpeData && rpeData.length > 0) {
          // Verificar si hay suficiente espacio en la página actual
          const remainingSpace = pageHeight - evalY - 100; // Margen de 100pt para el footer
          const estimatedRPEContentHeight = 150; // Estimación conservadora del contenido de RPE
          
          if (remainingSpace < estimatedRPEContentHeight) {
            // No hay suficiente espacio, crear nueva página
            pdf.addPage();
            
            // Recrear header en nueva página
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // FONDO ELEGANTE CON GRADIENTE PROFESIONAL
            // Fondo blanco base
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');

            // Banda lateral izquierda (azul corporativo)
            pdf.setFillColor(25, 47, 89);
            pdf.rect(0, 0, 8, pageHeight, 'F');

            // HEADER PROFESIONAL
            const headerHeight = 100;
            
            // Fondo del header (gradiente azul corporativo simulado)
            pdf.setFillColor(25, 47, 89);
            pdf.rect(0, 0, pageWidth, headerHeight, 'F');
            
            // Línea dorada de acento
            pdf.setFillColor(218, 165, 32);
            pdf.rect(0, headerHeight - 4, pageWidth, 4, 'F');

            // LOGO Y TÍTULO PRINCIPAL
            const logoSize = 60;
            pdf.addImage( logoCleaned, "PNG",
              40,
              20,
              logoSize,
              logoSize
            );

            // Título corporativo
            pdf.setFont("helvetica", "light");
            pdf.setFontSize(28);
            pdf.setTextColor(255, 255, 255);
            pdf.text("ESTADÍSTICAS DE", 120, 35);
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(32);
            pdf.text("CARGA INTERNA", 120, 65);

            // Línea decorativa
            pdf.setDrawColor(218, 165, 32);
            pdf.setLineWidth(2);
            pdf.line(120, 75, 320, 75);
            
            // Nombre del jugador en la nueva página
            const contentStartY = 140;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(20);
            pdf.setTextColor(17, 24, 39);
            pdf.text(player.name.toUpperCase(), 60, contentStartY);
            
            evalY = contentStartY + 40;
          } else {
            evalY += 50;
          }
          
          // Título de la sección de RPE
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(16);
          pdf.setTextColor(25, 47, 89);
          pdf.text("ESTADÍSTICAS DE CARGA INTERNA", 60, evalY);
          
          // Línea decorativa bajo el título
          pdf.setDrawColor(218, 165, 32);
          pdf.setLineWidth(2);
          pdf.line(60, evalY + 5, 360, evalY + 5);
          
          evalY += 35;

          // Calcular promedios de RPE
          const rpeCount = rpeData.length;
          
          const calculateRpeAverage = (field: string) => {
            const sum = rpeData.reduce((acc, response) => acc + (response[field] || 0), 0);
            return rpeCount > 0 ? sum / rpeCount : 0;
          };

          // Mostrar estadísticas de RPE en dos columnas
          let leftEvalY = evalY;
          let rightEvalY = evalY;
          
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(17, 24, 39);
          
          // Columna izquierda
          pdf.text("PUNTUACIÓN RPE:", leftColumnX, leftEvalY);
          leftEvalY += 15;
          drawWellnessBox(leftColumnX + 10, leftEvalY, `Promedio: ${calculateRpeAverage('rpe_score').toFixed(2)}/10`);
          
          // Columna derecha
          const rightColumnX = pageWidth / 2 - 20;
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(17, 24, 39);
          pdf.text("CARGA INTERNA:", rightColumnX, rightEvalY);
          rightEvalY += 15;
          drawWellnessBox(rightColumnX + 10, rightEvalY, `Promedio: ${calculateRpeAverage('internal_load').toFixed(2)}`);

          // Información adicional
          evalY = Math.max(leftEvalY, rightEvalY) + 30;
          
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(17, 24, 39);
          pdf.text(`TOTAL DE RESPUESTAS RPE: ${rpeCount}`, leftColumnX, evalY);
          
          evalY += 20;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(107, 114, 128);
          pdf.text("* Escala RPE del 1 al 10 (1 = Muy fácil, 10 = Máximo esfuerzo)", leftColumnX, evalY);
          evalY += 12;
          pdf.text("* Carga interna = RPE × Minutos de entrenamiento", leftColumnX, evalY);
        }
      } else if (bodyPainData && bodyPainData.length > 0 || rpeData && rpeData.length > 0) {
        // Si no hay datos de wellness pero sí hay datos de dolor corporal o RPE, crear página separada
        pdf.addPage();
        
        // Recrear header en nueva página
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // FONDO ELEGANTE CON GRADIENTE PROFESIONAL
        // Fondo blanco base
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Banda lateral izquierda (azul corporativo)
        pdf.setFillColor(25, 47, 89);
        pdf.rect(0, 0, 8, pageHeight, 'F');

        // HEADER PROFESIONAL
        const headerHeight = 100;
        
        // Fondo del header (gradiente azul corporativo simulado)
        pdf.setFillColor(25, 47, 89);
        pdf.rect(0, 0, pageWidth, headerHeight, 'F');
        
        // Línea dorada de acento
        pdf.setFillColor(218, 165, 32);
        pdf.rect(0, headerHeight - 4, pageWidth, 4, 'F');

        // LOGO Y TÍTULO PRINCIPAL
        const logoSize = 60;
        pdf.addImage( logoCleaned, "PNG",
          40,
          20,
          logoSize,
          logoSize
        );

        // Título corporativo
        pdf.setFont("helvetica", "light");
        pdf.setFontSize(28);
        pdf.setTextColor(255, 255, 255);
        pdf.text("PARTE MÉDICO", 120, 35);
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(32);
        pdf.text("PERSONAL", 120, 65);

        // Línea decorativa
        pdf.setDrawColor(218, 165, 32);
        pdf.setLineWidth(2);
        pdf.line(120, 75, 320, 75);
        
        // Nombre del jugador en la nueva página
        const contentStartY = 140;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(20);
        pdf.setTextColor(17, 24, 39);
        pdf.text(player.name.toUpperCase(), 60, contentStartY);
        
        let evalY = contentStartY + 40;
        const leftColumnX = 60;
        
        // Función para dibujar rectángulo de fondo azul para wellness/médico
        const drawWellnessBox = (x: number, y: number, text: string) => {
          // Calcular ancho del texto para que el rectángulo lo abarque completamente
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          const textWidth = pdf.getTextWidth(text);
          const wellnessPadding = 8;
          const wellnessCardHeight = 14;
          const boxWidth = textWidth + (wellnessPadding * 2);
          
          // Fondo azul profesional similar al header
          pdf.setFillColor(25, 47, 89); // Azul corporativo
          pdf.roundedRect(x - wellnessPadding, y - 10, boxWidth, wellnessCardHeight, 3, 3, 'F');
          
          // Borde azul más oscuro para profundidad
          pdf.setDrawColor(15, 37, 79);
          pdf.setLineWidth(0.8);
          pdf.roundedRect(x - wellnessPadding, y - 10, boxWidth, wellnessCardHeight, 3, 3, 'S');
          
          // Texto en blanco para contraste
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(255, 255, 255);
          pdf.text(text, x, y);
        };
        
        // Mostrar estadísticas por parte del cuerpo si hay datos de dolor corporal
        if (bodyPainData && bodyPainData.length > 0) {
          // Título de la sección de dolor corporal
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(16);
          pdf.setTextColor(25, 47, 89);
          pdf.text("ESTADÍSTICAS DE MOLESTIA MUSCULAR", 60, evalY);
          
          // Línea decorativa bajo el título
          pdf.setDrawColor(218, 165, 32);
          pdf.setLineWidth(2);
          pdf.line(60, evalY + 5, 360, evalY + 5);
          
          evalY += 35;

          // Agrupar por parte del cuerpo y contar ocurrencias
          const bodyPartCounts = bodyPainData.reduce((acc, response) => {
            const bodyPart = response.body_part;
            acc[bodyPart] = (acc[bodyPart] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          // Ordenar por cantidad (mayor a menor)
          const sortedBodyParts = Object.entries(bodyPartCounts)
            .sort(([,a], [,b]) => b - a);

          const totalBodyPainResponses = bodyPainData.length;
          
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(17, 24, 39);
          pdf.text(`TOTAL DE RESPUESTAS DE DOLOR: ${totalBodyPainResponses}`, leftColumnX, evalY);
          
          evalY += 25;
          
          // Mostrar estadísticas por parte del cuerpo
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(12);
          pdf.setTextColor(25, 47, 89);
          pdf.text("MOLESTIAS POR MÚSCULO/PARTE DEL CUERPO:", leftColumnX, evalY);
          evalY += 20;
          
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(17, 24, 39);
          
          sortedBodyParts.forEach(([bodyPart, count]) => {
            drawWellnessBox(leftColumnX + 10, evalY, `${bodyPart}: ${count} registro${count > 1 ? 's' : ''}`);
            evalY += 18; // Aumentar espacio para los rectángulos
          });
          
          // Información adicional sobre la escala
          evalY += 15;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(107, 114, 128);
          pdf.text("* Escala del 1 al 10 (1 = Sin dolor, 10 = Dolor extremo)", leftColumnX, evalY);
          evalY += 12;
          pdf.text("* Los datos muestran la cantidad de registros por músculo/parte del cuerpo", leftColumnX, evalY);
          
          evalY += 30;
        }
        
        // Agregar estadísticas de RPE si hay datos
        if (rpeData && rpeData.length > 0) {
          // Función para dibujar rectángulo de fondo azul para wellness/médico
          const drawWellnessBox = (x: number, y: number, text: string) => {
            // Calcular ancho del texto para que el rectángulo lo abarque completamente
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
            const textWidth = pdf.getTextWidth(text);
            const wellnessPadding = 8;
            const wellnessCardHeight = 14;
            const boxWidth = textWidth + (wellnessPadding * 2);
            
            // Fondo azul profesional similar al header
            pdf.setFillColor(25, 47, 89); // Azul corporativo
            pdf.roundedRect(x - wellnessPadding, y - 10, boxWidth, wellnessCardHeight, 3, 3, 'F');
            
            // Borde azul más oscuro para profundidad
            pdf.setDrawColor(15, 37, 79);
            pdf.setLineWidth(0.8);
            pdf.roundedRect(x - wellnessPadding, y - 10, boxWidth, wellnessCardHeight, 3, 3, 'S');
            
            // Texto en blanco para contraste
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
            pdf.setTextColor(255, 255, 255);
            pdf.text(text, x, y);
          };
          
          // Título de la sección de RPE
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(16);
          pdf.setTextColor(25, 47, 89);
          pdf.text("ESTADÍSTICAS DE CARGA INTERNA", 60, evalY);
          
          // Línea decorativa bajo el título
          pdf.setDrawColor(218, 165, 32);
          pdf.setLineWidth(2);
          pdf.line(60, evalY + 5, 360, evalY + 5);
          
          evalY += 35;

          // Calcular promedios de RPE
          const rpeCount = rpeData.length;
          
          const calculateRpeAverage = (field: string) => {
            const sum = rpeData.reduce((acc, response) => acc + (response[field] || 0), 0);
            return rpeCount > 0 ? sum / rpeCount : 0;
          };

          // Mostrar estadísticas de RPE en dos columnas
          const rightColumnX = pageWidth / 2 - 20;
          let leftEvalY = evalY;
          let rightEvalY = evalY;
          
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(17, 24, 39);
          
          // Columna izquierda
          pdf.text("PUNTUACIÓN RPE:", leftColumnX, leftEvalY);
          leftEvalY += 15;
          drawWellnessBox(leftColumnX + 10, leftEvalY, `Promedio: ${calculateRpeAverage('rpe_score').toFixed(2)}/10`);
          
          // Columna derecha
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(17, 24, 39);
          pdf.text("CARGA INTERNA:", rightColumnX, rightEvalY);
          rightEvalY += 15;
          drawWellnessBox(rightColumnX + 10, rightEvalY, `Promedio: ${calculateRpeAverage('internal_load').toFixed(2)}`);

          // Información adicional
          evalY = Math.max(leftEvalY, rightEvalY) + 30;
          
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(17, 24, 39);
          pdf.text(`TOTAL DE RESPUESTAS RPE: ${rpeCount}`, leftColumnX, evalY);
          
          evalY += 20;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(107, 114, 128);
          pdf.text("* Escala RPE del 1 al 10 (1 = Muy fácil, 10 = Máximo esfuerzo)", leftColumnX, evalY);
          evalY += 12;
          pdf.text("* Carga interna = RPE × Minutos de entrenamiento", leftColumnX, evalY);
        }
      }

      // FOOTER CORPORATIVO
      const footerY = pageHeight - 60;
      
      // Línea superior del footer
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(1);
      pdf.line(40, footerY, pageWidth - 40, footerY);

      // Información del footer
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      
      const currentDate = new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      pdf.text(`Documento generado el ${currentDate}`, 60, footerY + 20);
      pdf.text("Sistema de Gestión Deportiva Profesional", 60, footerY + 35);
      
      // Logo o marca de agua en el footer
      pdf.setTextColor(218, 165, 32);
      pdf.setFont("helvetica", "bold");
      pdf.text("CONFIDENCIAL", pageWidth - 60, footerY + 35, { align: 'right' });

      pdf.save(`ficha_tecnica_${player.name.toLowerCase().replace(/ /g, '_')}.pdf`);

      toast({
        title: "Éxito",
        description: "Ficha técnica generada correctamente",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar la ficha técnica",
      });
    }
  };

  const getPositionLabel = (value: string) => {
    const positions = {
      portero: "Portero",
      defensa_central: "Defensa Central",
      lateral_izquierdo: "Lateral Izquierdo",
      lateral_derecho: "Lateral Derecho",
      mediocampista_ofensivo: "Mediocampista Ofensivo",
      mediocampista_defensivo: "Mediocampista Defensivo",
      mediocampista_mixto: "Mediocampista Mixto",
      delantero_centro: "Delantero Centro",
      extremo_izquierdo: "Extremo Izquierdo",
      extremo_derecho: "Extremo Derecho",
    };
    return positions[value as keyof typeof positions] || value;
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

  const handleDeleteItem = () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'player') {
      onDelete(itemToDelete.id);
      toast({
        title: "Éxito",
        description: "Jugador eliminado correctamente",
      });
    } else if (itemToDelete.type === 'coach' && onDeleteCoach) {
      onDeleteCoach(itemToDelete.id);
      toast({
        title: "Éxito",
        description: "Entrenador eliminado correctamente",
      });
    }
    
    setItemToDelete(null);
    setShowDeleteDialog(false);
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
              className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl p-4 transition-all duration-300 shadow-lg transform hover:scale-105 ${onPlayerSelect ? "cursor-pointer" : ""}`}
              onClick={() => onPlayerSelect && onPlayerSelect(player.id)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl"></div>
              <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-12 h-12 border-2 border-border">
                    <AvatarImage 
                      src={player.image_url && player.updated_at ? `${player.image_url}?v=${new Date(player.updated_at).getTime()}` : player.image_url} 
                      alt={player.name}
                      key={player.image_url && player.updated_at ? `${player.image_url}?v=${new Date(player.updated_at).getTime()}` : player.image_url || 'no-image'}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {player.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-primary-foreground font-rajdhani font-semibold text-lg">{player.name}</h4>
                    <p className="text-primary-foreground/80 text-sm">
                      {player.position ? getPositionLabel(player.position) : 'Sin posición'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-primary-foreground/80 mb-3">
                  <div>Edad: {player.age || 'N/A'}</div>
                  <div>Altura: {player.height || 'N/A'}</div>
                  <div>Peso: {player.weight || 'N/A'}</div>
                  <div>Dorsal: {player.jersey_number || 'N/A'}</div>
                </div>

                {!onPlayerSelect && (
                  <div className="flex items-center justify-end gap-2 mt-3">
                    {showDownloadButton && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPlayerHistory(player);
                        }}
                        className="h-8 px-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary/20"
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                    )}
                    {hasEditPermission && !hideActions && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className={`h-8 px-2 text-primary-foreground bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={async (e) => {
                            e.stopPropagation();
                            
                            try {
                              const { data, error } = await supabase
                                .from('users')
                                .select('email')
                                .order('created_at', { ascending: false });
                                
                              if (!error && data) {
                                for (const user of data) {
                                  const playerWithEmail = {
                                    ...player,
                                    rut: user.email
                                  };
                                  setPlayerToEdit(playerWithEmail);
                                  break;
                                }
                              } else {
                                setPlayerToEdit(player);
                              }
                            } catch (error) {
                              console.error('Error fetching player email:', error);
                              setPlayerToEdit(player);
                            }
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {onTransfer && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              onTransfer(player);
                            }}>
                              <ArrowRightLeft className="mr-2 h-4 w-4" />
                              Transferir
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemToDelete({id: player.id, type: 'player'});
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )}

                <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCoaches = () => {
    if (coaches.length === 0) return null;

    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Entrenadores</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coaches.map((coach) => (
            <div 
              key={coach.id}
              className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl p-4 transition-all duration-300 shadow-lg transform hover:scale-105`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl"></div>
              <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-12 h-12 border-2 border-border">
                    <AvatarImage src={coach.image_url} alt={coach.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {coach.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-primary-foreground font-rajdhani font-semibold text-lg">{coach.name}</h4>
                    <p className="text-primary-foreground/80 text-sm">Entrenador</p>
                  </div>
                </div>

                <div className="text-sm text-primary-foreground/80 mb-3">
                  <div>Edad: {coach.age || 'N/A'}</div>
                </div>

                {hasEditPermission && (
                  <div className="flex items-center justify-end gap-2 mt-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className={`h-8 px-2 text-primary-foreground bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setCoachToEdit(coach)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        {onTransferCoach && (
                          <DropdownMenuItem onClick={() => onTransferCoach(coach)}>
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                            Transferir
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => {
                            setItemToDelete({id: coach.id, type: 'coach'});
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const groupedPlayers = groupPlayersByPosition(players);

  return (
    <>
      {renderCoaches()}
      {renderPlayerGroup(groupedPlayers.goalkeepers, "Porteros")}
      {renderPlayerGroup(groupedPlayers.defenders, "Defensas")}
      {renderPlayerGroup(groupedPlayers.midfielders, "Mediocampistas")}
      {renderPlayerGroup(groupedPlayers.forwards, "Delanteros")}
      {renderPlayerGroup(groupedPlayers.unassigned, "Sin posición asignada")}

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDeleteItem}
        title={`Eliminar ${itemToDelete?.type === 'coach' ? 'Entrenador' : 'Jugador'}`}
        description={`¿Estás seguro que deseas eliminar este ${itemToDelete?.type === 'coach' ? 'entrenador' : 'jugador'}? Esta acción no se puede deshacer.`}
      />

      {playerToEdit && (
        <AddPlayerModal
          isOpen={!!playerToEdit}
          onClose={() => setPlayerToEdit(null)}
          onAdd={(updatedPlayer) => {
            onEdit({ 
              ...updatedPlayer, 
              id: playerToEdit.id,
              age: typeof updatedPlayer.age === 'string' ? parseInt(updatedPlayer.age) : updatedPlayer.age
            });
            setPlayerToEdit(null);
          }}
          categoryId={playerToEdit.category_id}
          initialData={{
            ...playerToEdit,
            rut: playerEmail || playerToEdit.rut
          }}
        />
      )}

      {coachToEdit && onEditCoach && (
        <AddCoachModal
          isOpen={!!coachToEdit}
          onClose={() => setCoachToEdit(null)}
          onAdd={(updatedCoach) => {
            onEditCoach({
              ...updatedCoach,
              id: coachToEdit.id,
              age: updatedCoach.age ? updatedCoach.age.toString() : undefined
            });
            setCoachToEdit(null);
          }}
          categoryId={coachToEdit.category_id}
          initialData={coachToEdit}
        />
      )}
    </>
  );
}







