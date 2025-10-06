import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

interface AddMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (match: any) => void;
  seasonId: string;
  categoryId: string;
}

export function AddMatchModal({ isOpen, onClose, onAdd, seasonId, categoryId }: AddMatchModalProps) {
  const { toast } = useToast();
  const { getGradientClasses, theme } = useOrganizationTheme();
  const [match, setMatch] = useState({
    opponent: "",
    date: "",
    location: "",
    ohiggins_score: "",
    opponent_score: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!match.opponent.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El nombre del oponente es requerido",
      });
      return false;
    }
    if (!match.date) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La fecha es requerida",
      });
      return false;
    }
    if (!seasonId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar una temporada",
      });
      return false;
    }
    if (!categoryId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar una categoría",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const matchData = {
        opponent: match.opponent.trim(),
        date: match.date,
        location: match.location.trim() || null,
        ohiggins_score: match.ohiggins_score ? parseInt(match.ohiggins_score) : null,
        opponent_score: match.opponent_score ? parseInt(match.opponent_score) : null,
        season_id: window.location.pathname.includes('youth-football') ? seasonId : null,
        senior_season_id: window.location.pathname.includes('youth-football') ? null : seasonId,
        category_id: window.location.pathname.includes('youth-football') ? categoryId : null,
        senior_category_id: window.location.pathname.includes('youth-football') ? null : categoryId
      };

      await onAdd(matchData);
      
      // Limpiar el formulario después de un envío exitoso
      setMatch({ 
        opponent: "", 
        date: "", 
        location: "", 
        ohiggins_score: "", 
        opponent_score: "" 
      });
      
    } catch (error: any) {
      console.error('Error completo:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo crear el partido",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir Partido</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="opponent" className="text-sm font-medium">
              Nombre del Oponente *
            </label>
            <Input
              id="opponent"
              placeholder="Nombre del equipo oponente"
              value={match.opponent}
              onChange={(e) => setMatch({ ...match, opponent: e.target.value })}
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
              value={match.date}
              onChange={(e) => setMatch({ ...match, date: e.target.value })}
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
              value={match.location}
              onChange={(e) => setMatch({ ...match, location: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Resultado
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                placeholder={theme?.name || 'Organización'}
                value={match.ohiggins_score}
                onChange={(e) => setMatch({ ...match, ohiggins_score: e.target.value })}
                className="w-24"
              />
              <span className="text-lg font-medium">-</span>
              <Input
                type="number"
                min="0"
                placeholder="Rival"
                value={match.opponent_score}
                onChange={(e) => setMatch({ ...match, opponent_score: e.target.value })}
                className="w-24"
              />
            </div>
          </div>
          <Button 
            type="submit" 
            className={`w-full bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} text-primary-foreground border border-border hover:shadow-lg`}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Añadiendo..." : "Añadir Partido"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}