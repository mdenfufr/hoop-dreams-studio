
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { X } from "lucide-react";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

interface BodyModel3DProps {
  playerId: string;
  onSubmit?: () => void;
  skipPlayerIdValidation?: boolean;
}

interface PainItem {
  name: string;
  painLevel: number;
}

const muscles = [
  "Gastrocnemio",
  "Tibial anterior",
  "Popliteo",
  "Isquiotibial",
  "Cuadriceps",
  "Aductor",
  "Glúteo",
  "Lumbares",
  "Abdominales",
  "Pectoral",
  "Deltoides",
  "Bíceps",
  "Tríceps",
  "Trapecio",
  "Esternocleidomastoideo"
];

const bodyParts = [
  "Empeine",
  "Tobillo",
  "Rodilla",
  "Cadera",
  "Espalda baja",
  "Muñeca",
  "Codo",
  "Hombro",
  "Cuello",
  "Cabeza"
];

export function BodyModel3D({ playerId, onSubmit, skipPlayerIdValidation = false }: BodyModel3DProps) {
  const [hasPain, setHasPain] = useState<boolean | null>(null);
  const [selectedMuscles, setSelectedMuscles] = useState<PainItem[]>([]);
  const [selectedBodyParts, setSelectedBodyParts] = useState<PainItem[]>([]);
  const [description, setDescription] = useState("");
  const { getGradientClasses } = useOrganizationTheme();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!hasPain) {
      if (onSubmit) {
        onSubmit();
      }
      return;
    }

    if (selectedMuscles.length === 0 && selectedBodyParts.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor selecciona al menos un músculo o una parte del cuerpo",
      });
      return;
    }

    // Submit each body part and muscle as separate entries con descripción independiente
    try {
      // Process each body part
      if (selectedBodyParts.length > 0) {
        for (const bodyPart of selectedBodyParts) {
          const { error } = await supabase.from("body_pain_responses").insert({
            player_id: skipPlayerIdValidation ? null : playerId,
            body_part: `[Parte del cuerpo] ${bodyPart.name}`,
            pain_level: bodyPart.painLevel,
            description: description, // Descripción específica para molestia muscular
          });
          
          if (error) throw error;
        }
      }

      // Process each muscle
      if (selectedMuscles.length > 0) {
        for (const muscle of selectedMuscles) {
          const { error } = await supabase.from("body_pain_responses").insert({
            player_id: skipPlayerIdValidation ? null : playerId,
            body_part: `[Músculo] ${muscle.name}`,
            pain_level: muscle.painLevel,
            description: description, // Descripción específica para molestia muscular
          });
          
          if (error) throw error;
        }
      }

      toast({
        title: "Éxito",
        description: "Registro guardado correctamente",
      });

      // Reset form
      setSelectedMuscles([]);
      setSelectedBodyParts([]);
      setDescription("");
      setHasPain(null);

      if (onSubmit) {
        onSubmit();
      }
    } catch (error) {
      console.error("Error al guardar el registro:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el registro",
      });
    }
  };

  if (hasPain === null) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">¿Tienes alguna molestia?</h2>
        <div className="flex gap-4">
          <Button onClick={() => setHasPain(true)} className={`bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border hover:shadow-lg text-primary-foreground`}>Sí</Button>
          <Button onClick={() => setHasPain(false)} className={`bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border hover:shadow-lg text-primary-foreground`}>No</Button>
        </div>
      </div>
    );
  }

  if (!hasPain) {
    return null;
  }

  const handleMuscleSelect = (muscle: string) => {
    setSelectedMuscles([...selectedMuscles, { name: muscle, painLevel: 5 }]);
  };

  const handleBodyPartSelect = (bodyPart: string) => {
    setSelectedBodyParts([...selectedBodyParts, { name: bodyPart, painLevel: 5 }]);
  };

  const handleRemoveMuscle = (index: number) => {
    setSelectedMuscles(selectedMuscles.filter((_, i) => i !== index));
  };

  const handleRemoveBodyPart = (index: number) => {
    setSelectedBodyParts(selectedBodyParts.filter((_, i) => i !== index));
  };

  const handleMusclePainChange = (index: number, value: number[]) => {
    const newMuscles = [...selectedMuscles];
    newMuscles[index].painLevel = value[0];
    setSelectedMuscles(newMuscles);
  };

  const handleBodyPartPainChange = (index: number, value: number[]) => {
    const newBodyParts = [...selectedBodyParts];
    newBodyParts[index].painLevel = value[0];
    setSelectedBodyParts(newBodyParts);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Músculos seleccionados</Label>
          <div className="space-y-2 mt-2">
            {selectedMuscles.map((muscle, index) => (
              <div key={index} className="bg-blue-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{muscle.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMuscle(index)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="pl-2">
                  <Label className="text-xs text-muted-foreground">Nivel de dolor (1-10)</Label>
                  <Slider
                    value={[muscle.painLevel]}
                    onValueChange={(value) => handleMusclePainChange(index, value)}
                    max={10}
                    min={1}
                    step={1}
                  />
                </div>
              </div>
            ))}
          </div>
          <Select onValueChange={handleMuscleSelect}>
            <SelectTrigger className="w-full mt-2">
              <SelectValue placeholder="Selecciona un músculo" />
            </SelectTrigger>
            <SelectContent>
              {muscles.map((muscle) => (
                <SelectItem key={muscle} value={muscle}>
                  {muscle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Partes del cuerpo seleccionadas</Label>
          <div className="space-y-2 mt-2">
            {selectedBodyParts.map((part, index) => (
              <div key={index} className="bg-blue-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{part.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveBodyPart(index)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="pl-2">
                  <Label className="text-xs text-muted-foreground">Nivel de dolor (1-10)</Label>
                  <Slider
                    value={[part.painLevel]}
                    onValueChange={(value) => handleBodyPartPainChange(index, value)}
                    max={10}
                    min={1}
                    step={1}
                  />
                </div>
              </div>
            ))}
          </div>
          <Select onValueChange={handleBodyPartSelect}>
            <SelectTrigger className="w-full mt-2">
              <SelectValue placeholder="Selecciona una parte del cuerpo" />
            </SelectTrigger>
            <SelectContent>
              {bodyParts.map((part) => (
                <SelectItem key={part} value={part}>
                  {part}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Descripción de la molestia</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe tu molestia..."
            className="mt-2"
          />
        </div>
      </div>

      <Button type="submit" className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border hover:shadow-lg w-full`}>
        <span className="text-primary-foreground">Guardar</span>
      </Button>
    </form>
  );
}
