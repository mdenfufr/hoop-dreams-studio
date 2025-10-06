import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";

interface WellnessAverageChartProps {
  categoryId: string;
  isSenior?: boolean;
}

export const WellnessAverageChart = ({ categoryId, isSenior }: WellnessAverageChartProps) => {
  const { data: wellnessAverages, isLoading } = useQuery({
    queryKey: ["wellness-averages", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];

      let query = supabase
        .from("wellness_responses")
        .select(`
          sleep_quality,
          muscle_soreness,
          fatigue_level,
          stress_level,
          player_id,
          players!inner(category_id, senior_category_id, user_id)
        `);

      if (isSenior) {
        query = query.eq('players.senior_category_id', categoryId);
      } else {
        query = query.eq('players.category_id', categoryId);
      }

      // Mantener filtro actual para juveniles; incluir senior aunque no tengan user_id
      if (!isSenior) {
        query = query.not("players.user_id", "is", null);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching wellness data:", error);
        return [];
      }

      if (!data || data.length === 0) return [];

      // Calculate averages for each wellness metric
      const totals = data.reduce(
        (acc, response) => ({
          sleep_quality: acc.sleep_quality + (response.sleep_quality || 0),
          muscle_soreness: acc.muscle_soreness + (response.muscle_soreness || 0),
          fatigue_level: acc.fatigue_level + (response.fatigue_level || 0),
          stress_level: acc.stress_level + (response.stress_level || 0),
          count: acc.count + 1,
        }),
        { sleep_quality: 0, muscle_soreness: 0, fatigue_level: 0, stress_level: 0, count: 0 }
      );

      const count = totals.count || 1;

      return [
        {
          name: "Calidad del sueño",
          promedio: Math.round((totals.sleep_quality / count) * 100) / 100,
        },
        {
          name: "Dolores musculares",
          promedio: Math.round((totals.muscle_soreness / count) * 100) / 100,
        },
        {
          name: "Nivel de fatiga",
          promedio: Math.round((totals.fatigue_level / count) * 100) / 100,
        },
        {
          name: "Nivel de estrés",
          promedio: Math.round((totals.stress_level / count) * 100) / 100,
        },
      ];
    },
    enabled: !!categoryId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!wellnessAverages || wellnessAverages.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No hay datos de wellness disponibles para esta categoría
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Promedio de Respuestas Wellness por Categoría</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={wellnessAverages} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              fontSize={12}
            />
            <YAxis domain={[0, 5]} />
            <Tooltip 
              formatter={(value: number) => [value.toFixed(2), "Promedio"]}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Bar 
              dataKey="promedio" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-sm text-muted-foreground">
        * Escala del 1 al 5 (1 = Muy malo, 5 = Excelente)
      </div>
    </div>
  );
};