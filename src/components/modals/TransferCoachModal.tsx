import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

interface TransferCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachId: string;
  coachName: string;
  currentCategoryId: string;
  onTransfer: () => void;
}

export function TransferCoachModal({
  isOpen,
  onClose,
  coachId,
  coachName,
  currentCategoryId,
  onTransfer,
}: TransferCoachModalProps) {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Fetch seasons
  useEffect(() => {
    const fetchSeasons = async () => {
      const isYouthFootball = window.location.pathname.includes('youth-football');
      const { data, error } = await supabase
        .from(isYouthFootball ? "seasons" : "senior_seasons")
        .select("*")
        .order('created_at', { ascending: false });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las temporadas",
        });
        return;
      }
      
      setSeasons(data || []);
    };

    if (isOpen) {
      fetchSeasons();
    }
  }, [isOpen]);

  // Fetch categories when season changes
  useEffect(() => {
    const fetchCategories = async () => {
      if (!selectedSeasonId) {
        setCategories([]);
        return;
      }
      
      const isYouthFootball = window.location.pathname.includes('youth-football');
      const tableName = isYouthFootball ? "categories" : "senior_categories";
      const seasonField = isYouthFootball ? "season_id" : "senior_season_id";
      const sb: any = supabase;
      const { data, error } = await sb
        .from(tableName)
        .select("*")
        .eq(seasonField, selectedSeasonId)
        .order("name");
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las categorías",
        });
        return;
      }
      
      const filteredCategories = data?.filter((category: any) => category.id !== currentCategoryId) || [];
      setCategories(filteredCategories);
    };

    fetchCategories();
  }, [selectedSeasonId, currentCategoryId]);

  const handleTransfer = async () => {
    if (!selectedCategoryId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor selecciona una categoría",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Check if coach already exists in the target category
      const isYouthFootball = window.location.pathname.includes('youth-football');
      const queryBuilder = supabase
        .from("coach_category_assignments")
        .select("*")
        .eq("coach_id", coachId);
        
      if (isYouthFootball) {
        queryBuilder.eq("category_id", selectedCategoryId);
      } else {
        queryBuilder.eq("senior_category_id", selectedCategoryId);
      }
      
      const { data: existingAssignment } = await queryBuilder.maybeSingle();

      if (existingAssignment) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "El entrenador ya está asignado a esta categoría",
        });
        setIsLoading(false);
        return;
      }

      // Always assign as editor role since coach will exist in multiple categories
      const { error: assignmentError } = await supabase
        .from("coach_category_assignments")
        .insert({
          coach_id: coachId,
          ...(isYouthFootball ? { category_id: selectedCategoryId } : { senior_category_id: selectedCategoryId }),
          role: "editor",
        });

      if (assignmentError) throw assignmentError;

      toast({
        title: "Éxito",
        description: "Entrenador asignado correctamente a la nueva categoría",
      });

      onTransfer();
      onClose();
    } catch (error) {
      console.error("Assignment error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo asignar al entrenador a la nueva categoría",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset category selection when season changes
  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    setSelectedCategoryId("");
  };

  const { getGradientClasses } = useOrganizationTheme();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar Entrenador a Categoría</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Asignar a: <span className="font-medium">{coachName}</span> a una categoría adicional
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Seleccionar Temporada</label>
            <Select
              value={selectedSeasonId}
              onValueChange={handleSeasonChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar temporada" />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((season: any) => (
                  <SelectItem key={season.id} value={season.id}>
                    {season.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSeasonId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleccionar Categoría</label>
              <Select
                value={selectedCategoryId}
                onValueChange={setSelectedCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleTransfer} 
            disabled={isLoading || !selectedCategoryId}
            className={`bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} text-primary-foreground border border-border hover:shadow-lg`}
          >
            {isLoading ? "Asignando..." : "Asignar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}