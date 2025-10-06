import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface BodyPainResponsesListProps {
  playerId: string;
}

export function BodyPainResponsesList({ playerId }: BodyPainResponsesListProps) {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const { data: responses = [], isLoading, refetch } = useQuery({
    queryKey: ["body-pain-responses", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_pain_responses')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!playerId,
    refetchOnWindowFocus: true,
  });

  const { data: ailments = [] } = useQuery({
    queryKey: ["ailments", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ailments')
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
        No hay respuestas de dolor corporal registradas para este jugador
      </div>
    );
  }

  // Group responses by date and keep only the latest responses for each day
  const dailySessions = responses.reduce((groups, response) => {
    const sessionDate = new Date(response.created_at).toDateString();
    if (!groups[sessionDate]) {
      groups[sessionDate] = [];
    }
    groups[sessionDate].push(response);
    return groups;
  }, {} as Record<string, typeof responses>);

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          {Object.keys(dailySessions).length} respuesta{Object.keys(dailySessions).length !== 1 ? 's' : ''} de molestia muscular
        </p>
        <button 
          onClick={() => refetch()} 
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Actualizar
        </button>
      </div>

      {Object.entries(dailySessions).map(([sessionDate, sessionResponses]) => {
        const sessionId = sessionDate;
        const isExpanded = expandedSessions.has(sessionId);
        const muscles = sessionResponses.filter(r => r.body_part.includes('[Músculo]'));
        const bodyParts = sessionResponses.filter(r => r.body_part.includes('[Parte del cuerpo]'));
        
        // No necesitamos buscar ailments para la descripción de molestia muscular

        // Only count muscles and body parts for display
        const totalAffectedAreas = muscles.length + bodyParts.length;

        return (
          <Card key={sessionId} className="overflow-hidden">
            <CardHeader 
              className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSession(sessionId)}
            >
              <CardTitle className="flex justify-between items-center text-sm">
                <span>
                  {new Date(sessionDate).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                    {totalAffectedAreas} área{totalAffectedAreas !== 1 ? 's' : ''} afectada{totalAffectedAreas !== 1 ? 's' : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            
            {isExpanded && (
              <CardContent className="pt-0">
                <div className="space-y-6 border-t pt-6">
                  {/* Músculos seleccionados */}
                  {muscles.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-sm mb-3">Músculos seleccionados</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {muscles.map((muscle, index) => (
                          <div key={`muscle-${index}`}>
                            <p className="text-sm font-medium">
                              {muscle.body_part.replace('[Músculo] ', '')}
                            </p>
                            <p className="text-lg text-blue-600">{muscle.pain_level}/10</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Partes del cuerpo seleccionadas */}
                  {bodyParts.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-sm mb-3">Partes del cuerpo seleccionadas</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {bodyParts.map((bodyPart, index) => (
                          <div key={`bodypart-${index}`}>
                            <p className="text-sm font-medium">
                              {bodyPart.body_part.replace('[Parte del cuerpo] ', '')}
                            </p>
                            <p className="text-lg text-blue-600">{bodyPart.pain_level}/10</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description from molestia muscular */}
                  {sessionResponses.some(r => r.description) && (
                    <div className="mt-4">
                      <h4 className="font-medium text-sm mb-2">Descripción de la molestia</h4>
                      <p className="text-sm text-gray-700">{sessionResponses.find(r => r.description)?.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}