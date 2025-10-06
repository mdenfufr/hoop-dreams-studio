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

interface TransferPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  currentCategoryId: string;
  onTransfer: () => void;
}

export function TransferPlayerModal({
  isOpen,
  onClose,
  playerId,
  currentCategoryId,
  onTransfer,
}: TransferPlayerModalProps) {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [selectedSeasonType, setSelectedSeasonType] = useState<'youth' | 'senior' | ''>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Fetch seasons
  useEffect(() => {
    const fetchSeasons = async () => {
      // Fetch both youth and senior seasons
      const [youthResponse, seniorResponse] = await Promise.all([
        supabase
          .from("seasons")
          .select("*")
          .order('created_at', { ascending: false }),
        supabase
          .from("senior_seasons")
          .select("*")
          .order('created_at', { ascending: false })
      ]);
      
      if (youthResponse.error || seniorResponse.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las temporadas",
        });
        return;
      }
      
      // Combine both types of seasons with a type indicator
      const allSeasons = [
        ...(youthResponse.data || []).map(s => ({ ...s, type: 'youth' })),
        ...(seniorResponse.data || []).map(s => ({ ...s, type: 'senior' }))
      ];
      
      setSeasons(allSeasons);
    };

    if (isOpen) {
      fetchSeasons();
    }
  }, [isOpen]);

  // Fetch categories when season changes
  useEffect(() => {
    const fetchCategories = async () => {
      if (!selectedSeasonId || !selectedSeasonType) {
        setCategories([]);
        return;
      }
      
      // Determine which table to query based on the selected season type
      const tableName = selectedSeasonType === 'youth' ? "categories" : "senior_categories";
      const seasonField = selectedSeasonType === 'youth' ? "season_id" : "senior_season_id";
      
      const { data, error } = await supabase
        .from(tableName as any)
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
      
      // Only filter out current category if we're in the same type of football
      const currentIsYouth = window.location.pathname.includes('youth-football');
      const filteredCategories = (selectedSeasonType === 'youth' && currentIsYouth) || (selectedSeasonType === 'senior' && !currentIsYouth)
        ? data?.filter((category: any) => category.id !== currentCategoryId) || []
        : data || [];
      
      setCategories(filteredCategories);
    };

    fetchCategories();
  }, [selectedSeasonId, selectedSeasonType, currentCategoryId]);

  const handleTransfer = async () => {
    if (!selectedCategoryId || !selectedSeasonType) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor selecciona una categoría",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Finalizar la asignación actual estableciendo end_date
      const currentIsYouth = window.location.pathname.includes('youth-football');
      
      if (currentIsYouth) {
        await supabase
          .from("player_category_assignments")
          .update({ end_date: new Date().toISOString() })
          .eq("player_id", playerId)
          .eq("category_id", currentCategoryId)
          .is("end_date", null);
      } else {
        await supabase
          .from("player_category_assignments")
          .update({ end_date: new Date().toISOString() })
          .eq("player_id", playerId)
          .eq("senior_category_id", currentCategoryId)
          .is("end_date", null);
      }

      // Actualizar el jugador con la nueva categoría
      const { error: updateError } = await supabase
        .from("players")
        .update({
          category_id: selectedSeasonType === 'youth' ? selectedCategoryId : null,
          senior_category_id: selectedSeasonType === 'senior' ? selectedCategoryId : null,
        })
        .eq("id", playerId);

      if (updateError) throw updateError;

      // Crear nueva asignación para la nueva categoría
      const assignmentData = {
        player_id: playerId,
        category_id: selectedSeasonType === 'youth' ? selectedCategoryId : null,
        senior_category_id: selectedSeasonType === 'senior' ? selectedCategoryId : null,
        season_id: selectedSeasonType === 'youth' ? selectedSeasonId : null,
        senior_season_id: selectedSeasonType === 'senior' ? selectedSeasonId : null,
        start_date: new Date().toISOString(),
      };

      const { error: assignmentError } = await supabase
        .from("player_category_assignments")
        .insert(assignmentData);

      if (assignmentError) throw assignmentError;

      toast({
        title: "Éxito",
        description: "Jugador transferido correctamente a la nueva categoría",
      });

      onTransfer();
      onClose();
    } catch (error) {
      console.error("Transfer error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo transferir al jugador",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset category selection when season changes
  const handleSeasonChange = (value: string) => {
    // Value format: "seasonId|type"
    const [seasonId, seasonType] = value.split('|');
    setSelectedSeasonId(seasonId);
    setSelectedSeasonType(seasonType as 'youth' | 'senior');
    setSelectedCategoryId("");
  };

  const { getGradientClasses } = useOrganizationTheme();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir Jugador</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Seleccionar Temporada</label>
            <Select
              value={selectedSeasonId ? `${selectedSeasonId}|${selectedSeasonType}` : ""}
              onValueChange={handleSeasonChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar temporada" />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((season: any) => (
                  <SelectItem key={`${season.id}|${season.type}`} value={`${season.id}|${season.type}`}>
                    {season.name} {season.type === 'senior' ? '(Primer Equipo)' : '(Fútbol Joven)'}
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
            {isLoading ? "Transfiriendo..." : "Transferir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}