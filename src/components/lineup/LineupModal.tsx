import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Users, FileDown } from "lucide-react";
import { Json } from "@/integrations/supabase/types";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Coach } from "@/types/coach";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { usePermissions } from "@/hooks/use-permissions";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";
import { getOrganizationLogo } from "@/config/organizationLogos";
import { PreloadedImage } from "@/components/ui/preloaded-image";

interface Player {
  id: string;
  name: string;
  position: string;
  jersey_number?: string;
  deleted?: boolean;
}

interface Substitution {
  playerIn: string;
  playerOut: string;
  minute: string;
}

interface LineupModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  categoryId: string;
}

const defaultFormations = [
  { value: "4-3-3", label: "4-3-3" },
  { value: "4-4-2", label: "4-4-2" },
  { value: "3-5-2", label: "3-5-2" },
  { value: "5-3-2", label: "5-3-2" },
  { value: "4-2-3-1", label: "4-2-3-1" },
];

export function LineupModal({ isOpen, onClose, matchId, categoryId }: LineupModalProps) {
  const [formation, setFormation] = useState("4-3-3");
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, string>>({});
  const [substitutePlayers, setSubstitutePlayers] = useState<string[]>([]);
  const [notCalledPlayers, setNotCalledPlayers] = useState<string[]>([]);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [customFormation, setCustomFormation] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [savedFormations, setSavedFormations] = useState<Array<{ value: string; label: string }>>(defaultFormations);
  const [matchComments, setMatchComments] = useState<string>("");
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const { organizationId } = useOrganizationTheme();

  useEffect(() => {
    const fetchPlayers = async () => {
      // Verificar si es una categoría senior buscando en matches para determinar el tipo
      const { data: matchData } = await supabase
        .from("matches")
        .select("senior_category_id, category_id")
        .eq("id", matchId)
        .single();

      let currentPlayers, currentError;

      if (matchData?.senior_category_id) {
        // Es un partido de primer equipo, buscar jugadores por senior_category_id
        const result = await supabase
          .from("players")
          .select("*")
          .eq("senior_category_id", matchData.senior_category_id)
          .eq("is_deleted", false);
        currentPlayers = result.data;
        currentError = result.error;
      } else {
        // Es un partido de fútbol joven, buscar jugadores por category_id
        const result = await supabase
          .from("players")
          .select("*")
          .eq("category_id", categoryId)
          .eq("is_deleted", false);
        currentPlayers = result.data;
        currentError = result.error;
      }

      // Obtener jugadores que han participado en alineaciones de este partido
      const { data: lineupData, error: lineupError } = await supabase
        .from("match_lineups")
        .select("*")
        .eq("match_id", matchId)
        .maybeSingle();

      const currentPlayersList = currentPlayers || [];
      const lineupPlayerIds: string[] = [];

      if (!lineupError && lineupData) {
        // Extraer IDs de jugadores de la alineación guardada
        if (typeof lineupData.positions === 'object' && lineupData.positions !== null) {
          lineupPlayerIds.push(...Object.values(lineupData.positions as Record<string, string>));
        }
        if (Array.isArray(lineupData.substitutes)) {
          lineupPlayerIds.push(...lineupData.substitutes.map(String));
        }
        if (Array.isArray(lineupData.not_called)) {
          lineupPlayerIds.push(...lineupData.not_called.map(String));
        }
      }

      // Obtener datos de jugadores que estaban en la alineación pero ya no están en la categoría
      const deletedPlayerIds = lineupPlayerIds.filter(id => !currentPlayersList.find(p => p.id === id));
      let deletedPlayers: Player[] = [];

      if (deletedPlayerIds.length > 0) {
        const { data: deletedPlayersData } = await supabase
          .from("players")
          .select("*")
          .in("id", deletedPlayerIds);

        deletedPlayers = (deletedPlayersData || []).map(p => ({ ...p, deleted: true }));
      }

      const allPlayers = [...currentPlayersList, ...deletedPlayers];
      console.log("Players loaded for lineup:", allPlayers);
      setPlayers(allPlayers);
    };

    const fetchCoaches = async () => {
      // Verificar si es una categoría senior buscando en matches para determinar el tipo
      const { data: matchData } = await supabase
        .from("matches")
        .select("senior_category_id, category_id")
        .eq("id", matchId)
        .single();

      let coaches, error;

      if (matchData?.senior_category_id) {
        // Es un partido de primer equipo, buscar entrenadores por senior_category_id
        const result = await supabase
          .from("coach_category_assignments")
          .select(`
            *,
            coaches (
              id,
              name,
              age,
              email,
              image_url,
              senior_category_id,
              user_id,
              created_at
            )
          `)
          .eq('senior_category_id', categoryId);
        
        if (!result.error && result.data) {
          coaches = result.data.map(assignment => ({
            ...assignment.coaches,
            role: assignment.role,
            assignment_id: assignment.id
          }));
        }
        error = result.error;
      } else {
        // Es un partido de fútbol joven, buscar entrenadores por category_id
        const result = await supabase
          .from("coaches")
          .select("*")
          .eq("category_id", categoryId);
        coaches = result.data;
        error = result.error;
      }

      if (!error && coaches) {
        console.log("Coaches loaded for lineup:", coaches);
        setCoaches(coaches);
      }
    };

    const fetchExistingLineup = async () => {
      const { data, error } = await supabase
        .from("match_lineups")
        .select("*")
        .eq("match_id", matchId)
        .maybeSingle();

      if (!error && data) {
        setFormation(data.formation);
        if (typeof data.positions === 'object' && data.positions !== null) {
          setSelectedPlayers(data.positions as Record<string, string>);
        }
        if (Array.isArray(data.substitutes)) {
          setSubstitutePlayers(data.substitutes.map(String));
        }
        if (Array.isArray(data.not_called)) {
          setNotCalledPlayers(data.not_called.map(String));
        }
        if (Array.isArray(data.substitutions)) {
          const parsedSubstitutions = (data.substitutions as Json[]).map(sub => ({
            playerIn: String((sub as any).playerIn || ''),
            playerOut: String((sub as any).playerOut || ''),
            minute: String((sub as any).minute || '')
          }));
          setSubstitutions(parsedSubstitutions);
        }
        if (data.match_comments) {
          setMatchComments(data.match_comments);
        }
        if (!savedFormations.some(f => f.value === data.formation)) {
          setSavedFormations(prev => [...prev, { value: data.formation, label: data.formation }]);
        }
      }
    };

    fetchPlayers();
    fetchCoaches();
    fetchExistingLineup();
  }, [categoryId, matchId]);

  const validateCustomFormation = (value: string) => {
    const pattern = /^\d+-\d+-\d+(-\d+)?$/;
    if (!pattern.test(value)) return false;
    
    const numbers = value.split('-').map(Number);
    const sum = numbers.reduce((a, b) => a + b, 0);
    return sum === 10;
  };

  const handleCustomFormationChange = (value: string) => {
    setCustomFormation(value);
    if (validateCustomFormation(value)) {
      setFormation(value);
    }
  };

  const handleFormationSelect = (value: string) => {
    const currentPositions = { ...selectedPlayers };
    
    if (value === "custom") {
      setIsCustom(true);
    } else {
      const newPositions: Record<string, string> = {};
      const newFormationPositions = getPositionsFromFormation(value).map(pos => pos.position);
      const oldFormationPositions = getPositionsFromFormation(formation).map(pos => pos.position);
      
      oldFormationPositions.forEach((oldPos, index) => {
        if (newFormationPositions[index]) {
          newPositions[newFormationPositions[index]] = currentPositions[oldPos] || "";
        }
      });
      
      setSelectedPlayers(newPositions);
      setFormation(value);
      setIsCustom(false);
    }
  };

  const handleSaveCustomFormation = () => {
    if (validateCustomFormation(customFormation)) {
      const newFormation = { value: customFormation, label: customFormation };
      setSavedFormations(prev => [...prev, newFormation]);
      setFormation(customFormation);
      setIsCustom(false);
      toast({
        title: "Éxito",
        description: "Formación personalizada guardada",
      });
    } else {
      toast({
        title: "Error",
        description: "Formación inválida",
        variant: "destructive",
      });
    }
  };

  const getPositionsFromFormation = (formation: string) => {
    const positions: { top: string; left: string; position: string }[] = [];
    const numbers = formation.split("-").map(Number);

    // Portero
    positions.push({ top: "85%", left: "50%", position: "GK" });

    // Función auxiliar para distribuir jugadores en una línea
    const distributePlayersInLine = (count: number, top: number, prefix: string) => {
      const spacing = 100 / (count + 1);
      for (let i = 0; i < count; i++) {
        positions.push({
          top: `${top}%`,
          left: `${spacing * (i + 1)}%`,
          position: `${prefix}${i + 1}`,
        });
      }
    };

    // Defensas (siempre en la misma posición)
    distributePlayersInLine(numbers[0], 70, "DEF");

    if (numbers.length === 3) {
      // Formación tradicional (ej: 4-3-3)
      const midTop = 50; // Mediocampistas más arriba
      const fwdTop = 25; // Delanteros más adelantados
      
      distributePlayersInLine(numbers[1], midTop, "MID");
      distributePlayersInLine(numbers[2], fwdTop, "FWD");
    } else if (numbers.length === 4) {
      // Formación con 4 líneas (ej: 4-2-3-1)
      const dmfTop = 55; // Mediocampistas defensivos (subidos de 60% a 55%)
      const amfTop = 40; // Mediocampistas ofensivos
      const fwdTop = 20; // Delantero(s)

      distributePlayersInLine(numbers[1], dmfTop, "DMF");
      distributePlayersInLine(numbers[2], amfTop, "AMF");
      distributePlayersInLine(numbers[3], fwdTop, "FWD");
    }

    return positions;
  };

  const handlePlayerSelect = (position: string, playerId: string) => {
    setSelectedPlayers((prev) => ({
      ...prev,
      [position]: playerId,
    }));
  };

  const handleSubstituteSelect = (playerId: string) => {
    if (substitutePlayers.includes(playerId)) {
      setSubstitutePlayers(prev => prev.filter(id => id !== playerId));
    } else {
      setSubstitutePlayers(prev => [...prev, playerId]);
    }
  };

  const handleNotCalledSelect = (playerId: string) => {
    if (notCalledPlayers.includes(playerId)) {
      setNotCalledPlayers(prev => prev.filter(id => id !== playerId));
    } else {
      setNotCalledPlayers(prev => [...prev, playerId]);
    }
  };

  const [newSubstitution, setNewSubstitution] = useState<Substitution>({
    playerIn: "",
    playerOut: "",
    minute: ""
  });

  const handleSubstitutionChange = (index: number, field: keyof Substitution, value: string) => {
    setSubstitutions(prev => {
      const newSubstitutions = [...prev];
      newSubstitutions[index] = {
        ...newSubstitutions[index],
        [field]: value
      };
      return newSubstitutions;
    });
  };

  const handleRemoveSubstitution = (index: number) => {
    setSubstitutions(prev => prev.filter((_, i) => i !== index));
  };

  const isPlayerSelected = (playerId: string) => {
    return Object.values(selectedPlayers).includes(playerId) || 
           substitutePlayers.includes(playerId) || 
           notCalledPlayers.includes(playerId);
  };

  const getAvailablePlayersForSubstitution = () => {
    const fieldPlayers = Object.values(selectedPlayers);
    const benchPlayers = substitutePlayers;
    
    return {
      fieldPlayers: players.filter(player => fieldPlayers.includes(player.id)),
      benchPlayers: players.filter(player => benchPlayers.includes(player.id))
    };
  };

  const handleAddSubstitution = () => {
    if (newSubstitution.playerIn && newSubstitution.playerOut && newSubstitution.minute) {
      setSubstitutions(prev => [...prev, newSubstitution]);
      setNewSubstitution({
        playerIn: "",
        playerOut: "",
        minute: ""
      });
    }
  };

  const handleSaveLineup = async () => {
    try {
      const lineupData = {
        match_id: matchId,
        formation: formation,
        positions: selectedPlayers,
        substitutes: substitutePlayers,
        not_called: notCalledPlayers,
        substitutions: substitutions as unknown as Json,
        match_comments: matchComments
      };

      const { data: existingLineup, error: fetchError } = await supabase
        .from("match_lineups")
        .select("id")
        .eq("match_id", matchId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      let error;
      
      if (existingLineup) {
        const { error: updateError } = await supabase
          .from("match_lineups")
          .update(lineupData)
          .eq("match_id", matchId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("match_lineups")
          .insert([lineupData]);
        error = insertError;
      }

      if (error) {
        throw error;
      }

      toast({
        title: "Éxito",
        description: "Alineación guardada correctamente",
      });
      onClose();
    } catch (error) {
      console.error("Error saving lineup:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar la alineación",
        variant: "destructive",
      });
    }
  };

  const createArrow = (pdf: jsPDF, isUp: boolean): string => {
    const arrowWidth = 10;
    const arrowHeight = 15;
    
    const canvas = document.createElement('canvas');
    canvas.width = arrowWidth;
    canvas.height = arrowHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.beginPath();
      
      if (isUp) {
        // Draw up arrow (shaft and head)
        ctx.moveTo(arrowWidth / 2, 0);         // Arrow tip
        ctx.lineTo(arrowWidth / 2, arrowHeight); // Shaft
        ctx.moveTo(2, arrowHeight - 5);        // Left wing
        ctx.lineTo(arrowWidth / 2, 0);
        ctx.lineTo(arrowWidth - 2, arrowHeight - 5); // Right wing
      } else {
        // Draw down arrow (shaft and head)
        ctx.moveTo(arrowWidth / 2, 0);         // Start of shaft
        ctx.lineTo(arrowWidth / 2, arrowHeight); // Shaft
        ctx.moveTo(2, 5);                      // Left wing
        ctx.lineTo(arrowWidth / 2, arrowHeight);
        ctx.lineTo(arrowWidth - 2, 5);         // Right wing
      }
      
      ctx.strokeStyle = isUp ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    return canvas.toDataURL('image/png');
  };

  const handleDownloadPDF = async () => {
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4"
      });

      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (!matchData) {
        throw new Error('Match not found');
      }

      const pageWidth = pdf.internal.pageSize.getWidth();

      const logoWidth = 120;
      const logoHeight = 120;
      const logoX = (pageWidth - logoWidth) / 2;
      
      // Load image to get actual dimensions
      const logo = new Image();
      logo.src = getOrganizationLogo(organizationId);
      await new Promise((resolve) => {
        logo.onload = resolve;
      });
      
      // Create temporary canvas to ensure transparency
      const canvas = document.createElement('canvas');
      canvas.width = logo.width;
      canvas.height = logo.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw image preserving transparency
        ctx.drawImage(logo, 0, 0);
      }
      
      // Add image from canvas data URL (preserves transparency)
      pdf.addImage(
        canvas.toDataURL('image/png'),
        "PNG",
        logoX,
        20,
        logoWidth,
        logoHeight
      );

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Resumen del Partido", pageWidth / 2, logoHeight + 60, { align: 'center' });

      pdf.setFontSize(14);
      pdf.text(`O'Higgins vs ${matchData.opponent}`, pageWidth / 2, logoHeight + 90, { align: 'center' });

      const formattedDate = new Date(matchData.date).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Fecha: ${formattedDate}`, pageWidth / 2, logoHeight + 110, { align: 'center' });

      const score = `Resultado: ${matchData.ohiggins_score} - ${matchData.opponent_score}`;
      pdf.text(score, pageWidth / 2, logoHeight + 130, { align: 'center' });

      let resultText;
      let resultColor;
      
      if (matchData.ohiggins_score > matchData.opponent_score) {
        resultText = 'Victoria';
        resultColor = '#22c55e';
      } else if (matchData.ohiggins_score < matchData.opponent_score) {
        resultText = 'Derrota';
        resultColor = '#ef4444';
      } else {
        resultText = 'Empate';
        resultColor = '#0ea5e9';
      }

      pdf.setTextColor(resultColor);
      pdf.text(resultText, pageWidth / 2, logoHeight + 150, { align: 'center' });
      pdf.setTextColor(0, 0, 0);

      const fieldElement = document.getElementById('lineup-field');
      if (!fieldElement) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo encontrar el elemento para exportar",
        });
        return;
      }

      const fieldClone = fieldElement.cloneNode(true) as HTMLElement;
      fieldClone.style.position = 'absolute';
      fieldClone.style.left = '-9999px';
      fieldClone.style.top = '-9999px';
      document.body.appendChild(fieldClone);
      
      fieldClone.style.width = '500px';
      fieldClone.style.height = '600px';

      const canvasOptions = {
        scale: 2,
        backgroundColor: "#2AAE49",
        logging: false,
        onclone: (clonedDoc) => {
          const playerPositions = clonedDoc.querySelectorAll('.player-position');
          Array.from(playerPositions).forEach((position) => {
            const pos = position as HTMLElement;
            pos.style.transform = 'translate(-50%, -50%)';
          });
          
          const selectTriggers = clonedDoc.querySelectorAll('.player-number');
          Array.from(selectTriggers).forEach((trigger) => {
            const trig = trigger as HTMLElement;
            trig.style.display = 'flex';
            trig.style.alignItems = 'center';
            trig.style.justifyContent = 'center';
            
            const numDisplay = trig.querySelector('div');
            if (numDisplay) {
              numDisplay.textContent = (numDisplay as HTMLElement).textContent || '';
              (numDisplay as HTMLElement).style.position = 'absolute';
              (numDisplay as HTMLElement).style.top = 'calc(50% - 7px)';
              (numDisplay as HTMLElement).style.left = '50%';
              (numDisplay as HTMLElement).style.transform = 'translate(-50%, -50%)';
              (numDisplay as HTMLElement).style.fontSize = '14px';
              (numDisplay as HTMLElement).style.lineHeight = '1';
              (numDisplay as HTMLElement).style.width = 'auto';
              (numDisplay as HTMLElement).style.height = 'auto';
            }
          });
          
          const names = clonedDoc.getElementsByClassName('player-name');
          Array.from(names).forEach((name) => {
            (name as HTMLElement).style.color = 'white';
            (name as HTMLElement).style.padding = '2px 8px';
            (name as HTMLElement).style.borderRadius = '4px';
            (name as HTMLElement).style.whiteSpace = 'nowrap';
            (name as HTMLElement).style.textAlign = 'center';
            (name as HTMLElement).style.fontSize = '14px';
            (name as HTMLElement).style.fontWeight = '600';
            (name as HTMLElement).style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
          });
        }
      };

      try {
        const fieldCanvas = await html2canvas(fieldClone, canvasOptions);
        document.body.removeChild(fieldClone);

        const imgData = fieldCanvas.toDataURL('image/png');
        
        const pdfWidth = pageWidth * 0.75; 
        const pdfHeight = (fieldCanvas.height * pdfWidth) / fieldCanvas.width;
        const xOffset = (pageWidth - pdfWidth) / 2;
        const yOffset = logoHeight + 180;

        pdf.addImage(imgData, 'PNG', xOffset, yOffset, pdfWidth, pdfHeight);

        pdf.addPage();

        const margin = 40;
        let yPosition = margin;
        const lineHeight = 20;
        const headerFontSize = 14;
        const contentFontSize = 12;

        if (coaches.length > 0) {
          pdf.setFontSize(headerFontSize);
          pdf.setFont("helvetica", "bold");
          pdf.text("CUERPO TÉCNICO", margin, yPosition);
          yPosition += lineHeight;

          pdf.setFontSize(contentFontSize);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(0, 0, 0);

          coaches.forEach((coach) => {
            pdf.text(`• ${coach.name}`, margin + 10, yPosition);
            yPosition += 15;
          });

          yPosition += 10;
        }

        const addSection = (title: string, playerIds: string[]) => {
          pdf.setFontSize(headerFontSize);
          pdf.setFont("helvetica", "bold");
          pdf.text(title, margin, yPosition);
          yPosition += lineHeight;

          pdf.setFontSize(contentFontSize);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(0, 0, 0);

          const playersInList = playerIds.map(playerId => {
            const player = players.find(p => p.id === playerId);
            return player ? `${player.jersey_number ? `${player.jersey_number} - ` : ''}${player.name}` : '';
          }).filter(Boolean);

          playersInList.forEach((playerName) => {
            pdf.text(`• ${playerName}`, margin + 10, yPosition);
            yPosition += 15;
          });

          yPosition += 10;
        };

        const substitutesTitle = "BANCA";
        addSection(substitutesTitle, substitutePlayers);

        const notCalledTitle = "NO CITADOS";
        addSection(notCalledTitle, notCalledPlayers);

        const substitutionsTitle = "CAMBIOS EN LA BANCA";
        pdf.setFontSize(headerFontSize);
        pdf.setFont("helvetica", "bold");
        pdf.text(substitutionsTitle, margin, yPosition);
        yPosition += lineHeight;

        pdf.setFontSize(contentFontSize);
        pdf.setFont("helvetica", "normal");

        const upArrowData = createArrow(pdf, true);
        const downArrowData = createArrow(pdf, false);

        substitutions.forEach((sub) => {
          const playerIn = players.find(p => p.id === sub.playerIn);
          const playerOut = players.find(p => p.id === sub.playerOut);
          if (playerIn && playerOut) {
            pdf.text(`• ${playerIn.name}`, margin + 10, yPosition);
            pdf.addImage(upArrowData, 'PNG', margin + 120, yPosition - 10, 10, 15);
            pdf.text(playerOut.name, margin + 150, yPosition);
            pdf.addImage(downArrowData, 'PNG', margin + 260, yPosition - 10, 10, 15);
            pdf.text(`(${sub.minute}')`, margin + 290, yPosition);
            yPosition += 20;
          }
        });

        if (matchComments.trim()) {
          yPosition += 20;

          const commentsTitle = "COMENTARIOS DEL PARTIDO";
          pdf.setFontSize(headerFontSize);
          pdf.setFont("helvetica", "bold");
          pdf.text(commentsTitle, margin, yPosition);
          yPosition += lineHeight;

          pdf.setFontSize(contentFontSize);
          pdf.setFont("helvetica", "normal");

          const maxWidth = pageWidth - (margin * 2);
          const lines = pdf.splitTextToSize(matchComments, maxWidth);
          
          lines.forEach((line: string) => {
            if (yPosition + lineHeight > pdf.internal.pageSize.getHeight() - margin) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(line, margin, yPosition);
            yPosition += lineHeight;
          });
        }

        pdf.save(`alineacion_${new Date().toISOString().split('T')[0]}.pdf`);

        toast({
          title: "Éxito",
          description: "PDF descargado correctamente",
        });
      } catch (error) {
        console.error('Error during html2canvas:', error);
        document.body.removeChild(fieldClone);
        throw error;
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el PDF",
      });
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, playerId: string, source?: 'field' | 'bench') => {
    e.dataTransfer.setData('text/plain', playerId);
    e.dataTransfer.setData('source', source || '');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, target: string | 'bench') => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('text/plain');
    const source = e.dataTransfer.getData('source');

    if (target === 'bench') {
      if (source === 'field') {
        const position = Object.entries(selectedPlayers).find(([_, id]) => id === playerId)?.[0];
        if (position) {
          const newSelectedPlayers = { ...selectedPlayers };
          delete newSelectedPlayers[position];
          setSelectedPlayers(newSelectedPlayers);
          handleSubstituteSelect(playerId);
        }
      }
    } else {
      if (source === 'bench') {
        setSubstitutePlayers(prev => prev.filter(id => id !== playerId));
      } else if (source === 'field') {
        const oldPosition = Object.entries(selectedPlayers).find(([_, id]) => id === playerId)?.[0];
        if (oldPosition) {
          const newSelectedPlayers = { ...selectedPlayers };
          delete newSelectedPlayers[oldPosition];
          newSelectedPlayers[target] = playerId;
          setSelectedPlayers(newSelectedPlayers);
          return;
        }
      }
      handlePlayerSelect(target, playerId);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle>Alineación del Equipo</DialogTitle>
              <DialogDescription>
                Configura la formación y selecciona los jugadores para el partido
              </DialogDescription>
            </div>
            <Button onClick={handleDownloadPDF} variant="outline" className="gap-2">
              <FileDown className="w-4 h-4" />
              Descargar PDF
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            {!isCustom ? (
              <Select value={formation} onValueChange={handleFormationSelect}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecciona formación" />
                </SelectTrigger>
                <SelectContent>
                  {savedFormations.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Formación personalizada</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Ej: 4-3-3 o 4-2-3-1"
                  value={customFormation}
                  onChange={(e) => handleCustomFormationChange(e.target.value)}
                  className="w-[180px]"
                />
                <Button
                  variant="outline"
                  onClick={handleSaveCustomFormation}
                  disabled={!validateCustomFormation(customFormation)}
                >
                  Guardar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCustom(false)}
                >
                  Volver
                </Button>
              </div>
            )}
            {canEdit('football') && (
              <Button onClick={handleSaveLineup}>
                Guardar Alineación
              </Button>
            )}
          </div>

          <div className="flex gap-4">
            <div className="w-[70%] space-y-4">
              <div className="flex justify-center mb-4">
                <PreloadedImage 
                  src={getOrganizationLogo(organizationId)}
                  alt="Logo de la organización" 
                  className="w-32 h-32 object-contain"
                />
              </div>
              <div 
                id="lineup-field" 
                className="relative h-[900px] bg-[#2AAE49] rounded-lg overflow-hidden"
              >
                <div className="absolute inset-[40px] border-2 border-white">
                  <div className="absolute top-0 left-[20%] right-[20%] h-[14%] border-l-2 border-r-2 border-b-2 border-white" />
                  <div className="absolute top-0 left-[35%] right-[35%] h-[5%] border-l-2 border-r-2 border-b-2 border-white" />
                  <div className="absolute bottom-0 left-[20%] right-[20%] h-[14%] border-l-2 border-r-2 border-t-2 border-white" />
                  <div className="absolute bottom-0 left-[35%] right-[35%] h-[5%] border-l-2 border-r-2 border-t-2 border-white" />
                  
                  <div 
                    className="absolute w-[80px] h-[80px] border-2 border-white rounded-full"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                  
                  <div className="absolute top-[50%] left-0 right-0 h-[2px] bg-white" />
                  
                  <div className="absolute top-[10%] left-[48%] w-[1%] h-[1%] bg-white rounded-full" />
                  <div className="absolute bottom-[10%] left-[48%] w-[1%] h-[1%] bg-white rounded-full" />
                  
                  <div className="absolute top-[14%] left-[42.5%] w-[15%] h-[4%] border-2 border-t-0 border-white rounded-b-full" />
                  <div className="absolute bottom-[14%] left-[42.5%] w-[15%] h-[4%] border-2 border-b-0 border-white rounded-t-full" />
                  
                  <div className="absolute top-0 left-0 w-[20px] h-[20px] border-r-2 border-b-2 border-white" style={{ borderRadius: '0 0 20px 0' }} />
                  <div className="absolute top-0 right-0 w-[20px] h-[20px] border-l-2 border-b-2 border-white" style={{ borderRadius: '0 0 0 20px' }} />
                  <div className="absolute bottom-0 left-0 w-[20px] h-[20px] border-r-2 border-t-2 border-white" style={{ borderRadius: '0 20px 0 0' }} />
                  <div className="absolute bottom-0 right-0 w-[20px] h-[20px] border-l-2 border-t-2 border-white" style={{ borderRadius: '20px 0 0 0' }} />
                </div>

                {getPositionsFromFormation(formation).map((pos) => {
                  const playerId = selectedPlayers[pos.position];
                  const player = players.find(p => p.id === playerId);

                  return (
                    <div
                      key={pos.position}
                      className="absolute player-position transform -translate-x-1/2 -translate-y-1/2"
                      style={{ top: pos.top, left: pos.left }}
                      onDrop={(e) => handleDrop(e, pos.position)}
                      onDragOver={handleDragOver}
                    >
                      <div className="flex flex-col items-center">
                        <div 
                          className="relative"
                          draggable={!!player}
                          onDragStart={(e) => handleDragStart(e, player?.id || '', 'field')}
                        >
                          <Select
                            value={selectedPlayers[pos.position] || ""}
                            onValueChange={(value) => handlePlayerSelect(pos.position, value)}
                          >
                            <SelectTrigger 
                              className="player-number w-[35px] h-[35px] rounded-full bg-white flex items-center justify-center p-0 border-2"
                            >
                              <SelectValue>
                                <div style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  width: 'auto',
                                  height: 'auto',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '14px',
                                  lineHeight: '1'
                                }}>
                                  {player?.jersey_number || ""}
                                </div>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {players
                                .filter(player => !isPlayerSelected(player.id) || selectedPlayers[pos.position] === player.id)
                                .map((player) => (
                                   <SelectItem 
                                     key={player.id} 
                                     value={player.id}
                                     draggable
                                     onDragStart={(e) => handleDragStart(e, player.id)}
                                     className={`cursor-grab ${player.deleted ? "bg-yellow-200 text-gray-800" : ""}`}
                                   >
                                     {player.jersey_number ? `${player.jersey_number} - ${player.name}` : player.name} {player.deleted ? "(Eliminado)" : ""}
                                   </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {player && (
                          <span className="mt-1 text-sm font-medium text-white player-name">
                            {player.name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="bg-gray-100 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5" />
                  <h3 className="font-semibold">Cambios en la Banca</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 bg-white p-4 rounded-lg">
                    <Select
                      value={newSubstitution.playerIn}
                      onValueChange={(value) => setNewSubstitution(prev => ({ ...prev, playerIn: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Jugador que entra" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailablePlayersForSubstitution().benchPlayers.map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.jersey_number ? `${player.jersey_number} - ${player.name}` : player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newSubstitution.playerOut}
                      onValueChange={(value) => setNewSubstitution(prev => ({ ...prev, playerOut: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Jugador que sale" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailablePlayersForSubstitution().fieldPlayers.map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.jersey_number ? `${player.jersey_number} - ${player.name}` : player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Minuto"
                        value={newSubstitution.minute}
                        onChange={(e) => setNewSubstitution(prev => ({ ...prev, minute: e.target.value }))}
                        min="1"
                        max="90"
                        className="flex-1"
                      />
                      <Button 
                        variant="outline"
                        onClick={handleAddSubstitution}
                        disabled={!newSubstitution.playerIn || !newSubstitution.playerOut || !newSubstitution.minute}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {substitutions.map((sub, index) => {
                      const playerIn = players.find(p => p.id === sub.playerIn);
                      const playerOut = players.find(p => p.id === sub.playerOut);
                      return (
                        <div
                          key={index}
                          className="flex justify-between items-center p-2 bg-white rounded-lg"
                        >
                          <span>
                            {playerIn?.name} → {playerOut?.name} ({sub.minute}')
                          </span>
                          <button
                            onClick={() => handleRemoveSubstitution(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="w-[30%] space-y-4">
              {coaches.length > 0 && (
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5" />
                    <h3 className="font-semibold">Entrenadores</h3>
                  </div>
                  <div className="space-y-2">
                    {coaches.map((coach) => (
                      <div
                        key={coach.id}
                        className="flex items-center gap-2 p-2 bg-white rounded-lg"
                      >
                        <Avatar>
                          <AvatarImage src={coach.image_url} alt={coach.name} />
                          <AvatarFallback>{coach.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="flex-1">{coach.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5" />
                  <h3 className="font-semibold">Banca</h3>
                </div>
                <div className="space-y-4">
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value && !substitutePlayers.includes(value)) {
                        handleSubstituteSelect(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Seleccionar jugador" />
                    </SelectTrigger>
                    <SelectContent>
                      {players
                        .filter(player => !isPlayerSelected(player.id))
                        .map((player) => (
                           <SelectItem 
                             key={player.id} 
                             value={player.id}
                             draggable
                             onDragStart={(e) => handleDragStart(e, player.id)}
                             className={`cursor-grab ${player.deleted ? "bg-yellow-200 text-gray-800" : ""}`}
                           >
                             {player.jersey_number ? `${player.jersey_number} - ${player.name}` : player.name} {player.deleted ? "(Eliminado)" : ""}
                           </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <div className="space-y-2">
                    {substitutePlayers.map((playerId) => {
                      const player = players.find(p => p.id === playerId);
                      return player ? (
                        <div
                          key={player.id}
                          className="flex justify-between items-center p-2 bg-white rounded-lg"
                          draggable
                          onDragStart={(e) => handleDragStart(e, player.id, 'bench')}
                        >
                           <span className={`cursor-grab ${player.deleted ? "text-yellow-600" : ""}`}>
                             {player.jersey_number ? `${player.jersey_number} - ${player.name}` : player.name} {player.deleted ? "(Eliminado)" : ""}
                           </span>
                          <button
                            onClick={() => handleSubstituteSelect(player.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5" />
                  <h3 className="font-semibold">No Citados</h3>
                </div>
                <div className="space-y-4">
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value && !notCalledPlayers.includes(value)) {
                        handleNotCalledSelect(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Seleccionar jugador" />
                    </SelectTrigger>
                    <SelectContent>
                      {players
                        .filter(player => !isPlayerSelected(player.id))
                        .map((player) => (
                           <SelectItem 
                             key={player.id} 
                             value={player.id}
                             className={player.deleted ? "bg-yellow-200 text-gray-800" : ""}
                           >
                             {player.jersey_number ? `${player.jersey_number} - ${player.name}` : player.name} {player.deleted ? "(Eliminado)" : ""}
                           </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <div className="space-y-2">
                    {notCalledPlayers.map((playerId) => {
                      const player = players.find(p => p.id === playerId);
                      return player ? (
                        <div
                          key={player.id}
                          className="flex justify-between items-center p-2 bg-white rounded-lg"
                        >
                           <span className={player.deleted ? "text-yellow-600" : ""}>
                             {player.jersey_number ? `${player.jersey_number} - ${player.name}` : player.name} {player.deleted ? "(Eliminado)" : ""}
                           </span>
                          <button
                            onClick={() => handleNotCalledSelect(player.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5" />
            <h3 className="font-semibold">Comentarios del Partido</h3>
          </div>
          <textarea
            value={matchComments}
            onChange={(e) => setMatchComments(e.target.value)}
            placeholder="Escribe aquí los comentarios del partido..."
            className="w-full h-32 p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LineupModal;
