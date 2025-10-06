import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";

interface RPEAverageChartProps {
  categoryId: string;
  isSenior?: boolean;
}

export const RPEAverageChart = ({ categoryId, isSenior }: RPEAverageChartProps) => {
  const { data: rpeAverages, isLoading } = useQuery({
    queryKey: ["rpe-averages", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];

      let query = supabase
        .from("rpe_responses")
        .select(`
          rpe_score,
          minutes,
          internal_load,
          player_id,
          players!inner(category_id, senior_category_id, user_id)
        `);

      if (isSenior) {
        query = query.eq('players.senior_category_id', categoryId);
      } else {
        query = query.eq('players.category_id', categoryId);
      }

      if (!isSenior) {
        query = query.not("players.user_id", "is", null);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching RPE data:", error);
        return [];
      }

      if (!data || data.length === 0) return [];

      // Calculate averages for each RPE metric
      const totals = data.reduce(
        (acc, response) => ({
          rpe_score: acc.rpe_score + (response.rpe_score || 0),
          minutes: acc.minutes + (response.minutes || 0),
          internal_load: acc.internal_load + (response.internal_load || 0),
          count: acc.count + 1,
        }),
        { rpe_score: 0, minutes: 0, internal_load: 0, count: 0 }
      );

      const count = totals.count || 1;

      return [
        {
          name: "Puntuación RPE",
          promedio: Math.round((totals.rpe_score / count) * 100) / 100,
        },
        {
          name: "Minutos",
          promedio: Math.round((totals.minutes / count) * 100) / 100,
        },
        {
          name: "Carga Interna",
          promedio: Math.round((totals.internal_load / count) * 100) / 100,
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

  if (!rpeAverages || rpeAverages.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No hay datos de RPE disponibles para esta categoría
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Promedio de Carga Interna por Categoría</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rpeAverages} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              fontSize={12}
            />
            <YAxis />
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
        * Carga Interna = RPE × Minutos
      </div>
    </div>
  );
};