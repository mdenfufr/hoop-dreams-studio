import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WellnessResponsesListProps {
  playerId: string;
}

export function WellnessResponsesList({ playerId }: WellnessResponsesListProps) {
  const { data: responses = [], isLoading } = useQuery({
    queryKey: ["wellness-responses", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wellness_responses')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!playerId,
  });

  if (isLoading) return <div>Cargando respuestas...</div>;

  if (responses.length === 0) {
    return (
      <div className="text-center text-gray-500 p-8">
        No hay respuestas de wellness registradas para este jugador
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {responses.map((response) => (
        <Card key={response.id}>
          <CardHeader>
            <CardTitle className="text-sm">
              {new Date(response.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium">Calidad del sueño</p>
                <p className="text-lg text-blue-600">{response.sleep_quality}/10</p>
              </div>
              <div>
                <p className="text-sm font-medium">Dolor muscular</p>
                <p className="text-lg text-blue-600">{response.muscle_soreness}/10</p>
              </div>
              <div>
                <p className="text-sm font-medium">Nivel de fatiga</p>
                <p className="text-lg text-blue-600">{response.fatigue_level}/10</p>
              </div>
              <div>
                <p className="text-sm font-medium">Nivel de estrés</p>
                <p className="text-lg text-blue-600">{response.stress_level}/10</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}