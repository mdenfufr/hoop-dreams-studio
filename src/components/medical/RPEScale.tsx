import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

interface RPEScaleProps {
  onSubmit: (rpe: number, minutes: number, internalLoad: number) => void;
  playerId: string;
}

export function RPEScale({ onSubmit, playerId }: RPEScaleProps) {
  const [rpe, setRpe] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { getGradientClasses } = useOrganizationTheme();

  const getColorForRPE = (value: number) => {
    if (value <= 1) return "#F2FCE2"; // Verde suave
    if (value <= 3) return "#D4F4B4"; // Verde claro
    if (value <= 6) return "#FEF7CD"; // Amarillo suave
    if (value <= 8) return "#FEC6A1"; // Naranja suave
    return "#ea384c"; // Rojo
  };

  const calculateInternalLoad = async () => {
    if (minutes <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Los minutos deben ser mayores a 0",
      });
      return;
    }
    
    const internalLoad = rpe * minutes;
    setIsLoading(true);

    try {
      if (playerId) {
        // Guardar en la base de datos
        const { error } = await supabase
          .from('rpe_responses')
          .insert({
            player_id: playerId,
            rpe_score: rpe,
            minutes: minutes,
            internal_load: internalLoad,
          });

        if (error) throw error;

        toast({
          title: "RPE guardado",
          description: `RPE: ${rpe}, Minutos: ${minutes}, Carga interna: ${internalLoad}`,
        });

        // Reset form
        setRpe(1);
        setMinutes(0);
      }
      
      onSubmit(rpe, minutes, internalLoad);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la respuesta RPE",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-6 bg-white rounded-lg shadow-sm">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Índice de Esfuerzo Percibido (RPE)</h3>
        
        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm">RPE: {rpe}</span>
              <span 
                className="px-3 py-1 rounded-full text-sm"
                style={{ 
                  backgroundColor: getColorForRPE(rpe),
                  color: rpe >= 9 ? 'white' : 'black'
                }}
              >
                {rpe}
              </span>
            </div>
            <Slider
              value={[rpe]}
              onValueChange={(value) => setRpe(value[0])}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="minutes" className="text-sm font-medium">
              Minutos de entrenamiento
            </label>
            <Input
              id="minutes"
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
              min={0}
              placeholder="Ingrese los minutos"
            />
          </div>
        </div>
      </div>

      <Button 
        onClick={calculateInternalLoad}
        disabled={isLoading}
        className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border hover:shadow-lg w-full`}
      >
        <span className="text-primary-foreground">{isLoading ? "Guardando..." : "Calcular Carga Interna"}</span>
      </Button>

      <div className="text-sm text-gray-500">
        <p>Guía de RPE:</p>
        <ul className="space-y-1 mt-2">
          <li className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#F2FCE2" }}></span>
            <span>1: Muy, muy fácil</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#D4F4B4" }}></span>
            <span>2-3: Fácil</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FEF7CD" }}></span>
            <span>4-6: Moderado</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FEC6A1" }}></span>
            <span>7-8: Difícil</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ea384c" }}></span>
            <span>9-10: Máximo esfuerzo</span>
          </li>
        </ul>
      </div>
    </div>
  );
}