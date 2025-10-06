import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { BodyPart } from "./types";

interface PainLevelSelectorProps {
  selectedPart: BodyPart;
  painLevel: number;
  onPainLevelChange: (value: number) => void;
  onSubmit: () => void;
}

export function PainLevelSelector({ 
  selectedPart, 
  painLevel, 
  onPainLevelChange, 
  onSubmit 
}: PainLevelSelectorProps) {
  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-medium">
        Nivel de dolor en {selectedPart.name}
      </h3>
      <div className="space-y-2">
        <Slider
          value={[painLevel]}
          onValueChange={(value) => onPainLevelChange(value[0])}
          min={1}
          max={10}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-gray-500">
          <span>Mínimo (1)</span>
          <span>Máximo (10)</span>
        </div>
      </div>
      <Button onClick={onSubmit} className={`relative bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary))] hover:from-[hsl(var(--primary))] hover:to-[hsl(var(--primary))] border border-border hover:shadow-lg w-full`}>
        <span className="text-primary-foreground">Guardar Respuesta</span>
      </Button>
    </div>
  );
}