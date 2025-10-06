import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RPEResponsesListProps {
  playerId: string;
}

export function RPEResponsesList({ playerId }: RPEResponsesListProps) {
  const { data: responses = [], isLoading } = useQuery({
    queryKey: ["rpe-responses", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rpe_responses')
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
        No hay respuestas RPE registradas para este jugador
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">RPE Score</p>
                <p className="text-lg text-blue-600">{response.rpe_score}/10</p>
              </div>
              <div>
                <p className="text-sm font-medium">Minutos</p>
                <p className="text-lg text-blue-600">{response.minutes}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Carga Interna</p>
                <p className="text-lg text-blue-600">{response.internal_load}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}