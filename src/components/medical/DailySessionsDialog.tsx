import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

interface DailySessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string | null;
  seasonId: string | null;
  isSeniorCategory: boolean;
}

export function DailySessionsDialog({
  open,
  onOpenChange,
  categoryId,
  seasonId,
  isSeniorCategory,
}: DailySessionsDialogProps) {
  const [sessionCount, setSessionCount] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const { getGradientClasses } = useOrganizationTheme();

  // Cargar configuración existente si existe
  useEffect(() => {
    const loadExistingConfig = async () => {
      if (!categoryId || !open) return;

      try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('daily_training_sessions')
          .select('session_count')
          .eq('config_date', today)
          .eq(isSeniorCategory ? 'senior_category_id' : 'category_id', categoryId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setSessionCount(data.session_count.toString());
        } else {
          setSessionCount("0");
        }
      } catch (error) {
        console.error('Error al cargar configuración:', error);
      }
    };

    loadExistingConfig();
  }, [categoryId, isSeniorCategory, open]);

  const handleSubmit = async () => {
    if (!categoryId || !seasonId) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!userData?.organization_id) throw new Error("Usuario sin organización");

      const today = new Date().toISOString().split('T')[0];
      
      const configData = {
        config_date: today,
        session_count: parseInt(sessionCount),
        [isSeniorCategory ? 'senior_category_id' : 'category_id']: categoryId,
        [isSeniorCategory ? 'senior_season_id' : 'season_id']: seasonId,
        organization_id: userData.organization_id,
        created_by: user.id,
      };

      const { error } = await supabase
        .from('daily_training_sessions')
        .upsert(configData, {
          onConflict: `config_date,${isSeniorCategory ? 'senior_category_id' : 'category_id'}`,
        });

      if (error) throw error;

      toast({
        title: "Configuración guardada",
        description: `Se configuraron ${sessionCount} sesiones de entrenamiento para hoy`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error al guardar configuración:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo guardar la configuración",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configuración de Sesiones de Entrenamiento</DialogTitle>
          <DialogDescription>
            ¿Cuántas sesiones de entrenamiento se realizarán el día de hoy?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup value={sessionCount} onValueChange={setSessionCount}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="0" id="session-0" />
              <Label htmlFor="session-0" className="cursor-pointer">
                0 sesiones (día de descanso)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1" id="session-1" />
              <Label htmlFor="session-1" className="cursor-pointer">
                1 sesión
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="2" id="session-2" />
              <Label htmlFor="session-2" className="cursor-pointer">
                2 sesiones
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="3" id="session-3" />
              <Label htmlFor="session-3" className="cursor-pointer">
                3 o más sesiones
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className={`w-full bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')}`}
        >
          {isLoading ? "Guardando..." : "Guardar configuración"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}