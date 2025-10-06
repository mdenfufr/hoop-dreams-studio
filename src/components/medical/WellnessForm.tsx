
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

interface WellnessFormProps {
  playerId: string;
  onSubmit?: () => void;
  skipPlayerIdValidation?: boolean;
}

export function WellnessForm({ playerId, onSubmit, skipPlayerIdValidation = false }: WellnessFormProps) {
  const [sleepQuality, setSleepQuality] = useState([5]);
  const [muscleSoreness, setMuscleSoreness] = useState([5]);
  const [fatigueLevel, setFatigueLevel] = useState([5]);
  const [stressLevel, setStressLevel] = useState([5]);
  const [existingResponse, setExistingResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { getGradientClasses } = useOrganizationTheme();

  // Cargar respuesta existente del día si existe
  useEffect(() => {
    const loadExistingResponse = async () => {
      if (skipPlayerIdValidation || !playerId) return;
      
      setIsLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('wellness_responses')
          .select('*')
          .eq('player_id', playerId)
          .eq('response_date', today)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setExistingResponse(data);
          setSleepQuality([data.sleep_quality]);
          setMuscleSoreness([data.muscle_soreness]);
          setFatigueLevel([data.fatigue_level]);
          setStressLevel([data.stress_level]);
        }
      } catch (error) {
        console.error('Error al cargar respuesta existente:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingResponse();
  }, [playerId, skipPlayerIdValidation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let player;
      if (!skipPlayerIdValidation) {
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select('user_id, category_id, senior_category_id')
          .eq('id', playerId)
          .single();

        if (playerError) throw playerError;

        if (!playerData.user_id) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Solo los jugadores autenticados pueden registrar respuestas de wellness",
          });
          return;
        }
        player = playerData;
      }

      // Validar sesiones disponibles
      if (!existingResponse && player) {
        const today = new Date().toISOString().split('T')[0];
        const categoryId = player.senior_category_id || player.category_id;
        const isSenior = !!player.senior_category_id;

        // Obtener configuración de sesiones del día
        const { data: sessionConfig } = await supabase
          .from('daily_training_sessions')
          .select('session_count')
          .eq('config_date', today)
          .eq(isSenior ? 'senior_category_id' : 'category_id', categoryId)
          .maybeSingle();

        if (!sessionConfig || sessionConfig.session_count === 0) {
          toast({
            variant: "destructive",
            title: "Sin sesiones configuradas",
            description: "No hay sesiones de entrenamiento configuradas para hoy",
          });
          return;
        }

        // Contar respuestas existentes del jugador hoy
        const { count } = await supabase
          .from('wellness_responses')
          .select('*', { count: 'exact', head: true })
          .eq('player_id', playerId)
          .eq('response_date', today);

        if (count && count >= sessionConfig.session_count) {
          toast({
            variant: "destructive",
            title: "Límite alcanzado",
            description: `Ya completaste las ${sessionConfig.session_count} sesiones permitidas para hoy`,
          });
          return;
        }
      }

      let error;
      
      if (existingResponse) {
        const { error: updateError } = await supabase
          .from('wellness_responses')
          .update({
            sleep_quality: sleepQuality[0],
            muscle_soreness: muscleSoreness[0],
            fatigue_level: fatigueLevel[0],
            stress_level: stressLevel[0],
          })
          .eq('id', existingResponse.id);
        
        error = updateError;
      } else {
        const { data: newResponse, error: insertError } = await supabase
          .from('wellness_responses')
          .insert([
            {
              player_id: skipPlayerIdValidation ? null : playerId,
              sleep_quality: sleepQuality[0],
              muscle_soreness: muscleSoreness[0],
              fatigue_level: fatigueLevel[0],
              stress_level: stressLevel[0],
            }
          ])
          .select()
          .single();
        
        error = insertError;
        
        if (!error && newResponse) {
          setExistingResponse(newResponse);
        }
      }

      if (error) throw error;

      toast({
        title: "Éxito",
        description: existingResponse ? "Respuesta actualizada correctamente" : "Respuesta guardada correctamente",
      });

      if (onSubmit) {
        onSubmit();
      }
    } catch (error) {
      console.error('Error al guardar las respuestas:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar las respuestas",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>¿Cómo dormiste anoche?</Label>
          <div className="pt-2">
            <Slider
              value={sleepQuality}
              onValueChange={setSleepQuality}
              max={10}
              min={1}
              step={1}
            />
          </div>
        </div>

        <div>
          <Label>¿Cuánto te duelen los músculos?</Label>
          <div className="pt-2">
            <Slider
              value={muscleSoreness}
              onValueChange={setMuscleSoreness}
              max={10}
              min={1}
              step={1}
            />
          </div>
        </div>

        <div>
          <Label>¿Cuán fatigado estás hoy?</Label>
          <div className="pt-2">
            <Slider
              value={fatigueLevel}
              onValueChange={setFatigueLevel}
              max={10}
              min={1}
              step={1}
            />
          </div>
        </div>

        <div>
          <Label>¿Cómo de estresado estás hoy?</Label>
          <div className="pt-2">
            <Slider
              value={stressLevel}
              onValueChange={setStressLevel}
              max={10}
              min={1}
              step={1}
            />
          </div>
        </div>
      </div>

      <Button type="submit" className={`w-full relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border hover:shadow-lg`} disabled={isLoading}>
        {existingResponse ? "Actualizar Respuestas" : "Guardar Respuestas"}
      </Button>
    </form>
  );
}
