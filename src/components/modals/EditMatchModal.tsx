import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
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

interface EditMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  onEdit?: (match: Match) => void;
}

export function EditMatchModal({ isOpen, onClose, match, onEdit }: EditMatchModalProps) {
  const { toast } = useToast();
  const { getGradientClasses, theme } = useOrganizationTheme();
  const [editedMatch, setEditedMatch] = useState({
    ...match,
    location: match.location || "",
    ohiggins_score: match.ohiggins_score?.toString() || "",
    opponent_score: match.opponent_score?.toString() || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editedMatch.opponent.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El nombre del oponente es requerido",
      });
      return;
    }

    if (!editedMatch.date) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La fecha es requerida",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (onEdit) {
        const updatedMatch: Match = {
          ...match,
          opponent: editedMatch.opponent,
          date: editedMatch.date,
          location: editedMatch.location.trim() || null,
          ohiggins_score: editedMatch.ohiggins_score ? parseInt(editedMatch.ohiggins_score) : null,
          opponent_score: editedMatch.opponent_score ? parseInt(editedMatch.opponent_score) : null,
        };
        onEdit(updatedMatch);
      }

      toast({
        title: "Éxito",
        description: "Partido actualizado correctamente",
      });

      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo actualizar el partido",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Partido</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="opponent" className="text-sm font-medium">
              Nombre del Oponente *
            </label>
            <Input
              id="opponent"
              placeholder="Nombre del equipo oponente"
              value={editedMatch.opponent}
              onChange={(e) => setEditedMatch({ ...editedMatch, opponent: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="date" className="text-sm font-medium">
              Fecha *
            </label>
            <Input
              id="date"
              type="datetime-local"
              value={editedMatch.date}
              onChange={(e) => setEditedMatch({ ...editedMatch, date: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="location" className="text-sm font-medium">
              Ubicación
            </label>
            <Input
              id="location"
              placeholder="Lugar del partido"
              value={editedMatch.location}
              onChange={(e) => setEditedMatch({ ...editedMatch, location: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Resultado</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                placeholder={theme?.name || 'Organización'}
                value={editedMatch.ohiggins_score}
                onChange={(e) => setEditedMatch({ ...editedMatch, ohiggins_score: e.target.value })}
                className="w-24"
              />
              <span className="text-lg font-medium">-</span>
              <Input
                type="number"
                min="0"
                placeholder="Rival"
                value={editedMatch.opponent_score}
                onChange={(e) => setEditedMatch({ ...editedMatch, opponent_score: e.target.value })}
                className="w-24"
              />
            </div>
          </div>
          <Button 
            type="submit" 
            className={`w-full bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} text-primary-foreground border border-border hover:shadow-lg`}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}