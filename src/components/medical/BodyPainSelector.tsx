import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { BodyPart, bodyParts } from "./types";
import { PainPoint } from "./PainPoint";
import { PainLevelSelector } from "./PainLevelSelector";

interface BodyPainSelectorProps {
  playerId: string;
  onSubmit?: () => void;
}

export function BodyPainSelector({ playerId, onSubmit }: BodyPainSelectorProps) {
  const [selectedPart, setSelectedPart] = useState<BodyPart | null>(null);
  const [painLevel, setPainLevel] = useState<number>(1);
  const [view, setView] = useState<"front" | "back">("front");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedPart) return;

    const { error } = await supabase
      .from("body_pain_responses")
      .insert([
        {
          player_id: playerId,
          body_part: selectedPart.id,
          pain_level: painLevel,
        },
      ]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la respuesta",
      });
      return;
    }

    toast({
      title: "Éxito",
      description: "Respuesta guardada correctamente",
    });

    setSelectedPart(null);
    setPainLevel(1);
    if (onSubmit) onSubmit();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-4 mb-4">
        <Button
          variant={view === "front" ? "default" : "outline"}
          onClick={() => setView("front")}
        >
          Vista Frontal
        </Button>
        <Button
          variant={view === "back" ? "default" : "outline"}
          onClick={() => setView("back")}
        >
          Vista Posterior
        </Button>
      </div>

      <div className="relative w-64 mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            <img
              src={view === "front" ? "/lovable-uploads/f38c8a55-bc52-4094-ba35-922d9f53e727.png" : "/lovable-uploads/35f277b8-2eb9-4d8b-9305-c261d0526a41.png"}
              alt={`Vista ${view === "front" ? "frontal" : "posterior"} del cuerpo`}
              className="w-full h-auto"
            />
            
            <div className="absolute inset-0">
              {bodyParts
                .filter((part) => part.view === view)
                .map((part) => (
                  <PainPoint
                    key={part.id}
                    part={part}
                    isSelected={selectedPart?.id === part.id}
                    onClick={() => setSelectedPart(part)}
                  />
                ))}
            </div>
          </>
        )}
      </div>

      {selectedPart && (
        <PainLevelSelector
          selectedPart={selectedPart}
          painLevel={painLevel}
          onPainLevelChange={setPainLevel}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}