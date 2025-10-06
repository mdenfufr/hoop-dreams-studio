import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";

interface BodyPainCountChartProps {
  categoryId: string;
  dateFrom?: string;
  dateTo?: string;
  isSenior?: boolean;
}

export const BodyPainCountChart = ({ categoryId, dateFrom, dateTo, isSenior }: BodyPainCountChartProps) => {
  const { data: painCounts, isLoading } = useQuery({
    queryKey: ["pain-counts", categoryId, dateFrom, dateTo],
    queryFn: async () => {
      if (!categoryId) return [];

      let query = supabase
        .from("body_pain_responses")
        .select(`
          body_part,
          player_id,
          created_at,
          players!inner(category_id, senior_category_id)
        `);

      if (isSenior) {
        query = query.eq('players.senior_category_id', categoryId);
      } else {
        query = query.eq('players.category_id', categoryId);
      }

      // Apply date filters if provided
      if (dateFrom && dateTo) {
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // Include the entire end date
        
        query = query
          .gte("created_at", fromDate.toISOString())
          .lte("created_at", toDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching pain count data:", error);
        return [];
      }

      if (!data || data.length === 0) return [];

      // Group by body_part and count unique players
      const groupedData = data.reduce((acc, response) => {
        const bodyPart = response.body_part;
        const playerId = response.player_id;
        
        if (!acc[bodyPart]) {
          acc[bodyPart] = new Set();
        }
        acc[bodyPart].add(playerId);
        return acc;
      }, {} as Record<string, Set<string>>);

      // Convert Sets to counts
      const countData = Object.entries(groupedData).reduce((acc, [bodyPart, playerSet]) => {
        acc[bodyPart] = playerSet.size;
        return acc;
      }, {} as Record<string, number>);

      // Convert to array format for chart
      const chartData = Object.entries(countData)
        .map(([bodyPart, count]) => ({
          name: bodyPart,
          cantidad: count,
        }))
        .sort((a, b) => b.cantidad - a.cantidad); // Sort by highest count

      return chartData;
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

  if (!painCounts || painCounts.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No hay datos de respuestas de dolor muscular disponibles para esta categoría
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Cantidad de Jugadores por Músculo/Parte del Cuerpo</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={painCounts} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
              formatter={(value: number) => [value, "Cantidad de jugadores"]}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Bar 
              dataKey="cantidad" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-sm text-muted-foreground">
        * Número de jugadores únicos que reportaron molestias en cada parte del cuerpo | Ordenado por mayor cantidad
      </div>
    </div>
  );
};