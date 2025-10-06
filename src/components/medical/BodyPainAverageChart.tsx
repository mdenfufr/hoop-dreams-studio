import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";

interface BodyPainAverageChartProps {
  categoryId: string;
  dateFrom?: string;
  dateTo?: string;
  isSenior?: boolean;
}

export const BodyPainAverageChart = ({ categoryId, dateFrom, dateTo, isSenior }: BodyPainAverageChartProps) => {
  const { data: painAverages, isLoading } = useQuery({
    queryKey: ["pain-averages", categoryId, dateFrom, dateTo],
    queryFn: async () => {
      if (!categoryId) return [];

      let query = supabase
        .from("body_pain_responses")
        .select(`
          body_part,
          pain_level,
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
        console.error("Error fetching pain data:", error);
        return [];
      }

      if (!data || data.length === 0) return [];

      // Group by body_part and calculate averages
      const groupedData = data.reduce((acc, response) => {
        const bodyPart = response.body_part;
        if (!acc[bodyPart]) {
          acc[bodyPart] = {
            total: 0,
            count: 0,
          };
        }
        acc[bodyPart].total += response.pain_level || 0;
        acc[bodyPart].count += 1;
        return acc;
      }, {} as Record<string, { total: number; count: number }>);

      // Convert to array format for chart
      const chartData = Object.entries(groupedData)
        .map(([bodyPart, data]) => ({
          name: bodyPart,
          promedio: Math.round((data.total / data.count) * 100) / 100,
          cantidad: data.count,
        }))
        .sort((a, b) => b.promedio - a.promedio); // Sort by highest average pain

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

  if (!painAverages || painAverages.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No hay datos de dolor muscular disponibles para esta categoría
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Promedio de Nivel de Dolor por Músculo/Parte del Cuerpo</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={painAverages} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              fontSize={12}
            />
            <YAxis domain={[0, 10]} />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === "promedio") return [value.toFixed(2), "Promedio de dolor"];
                if (name === "cantidad") return [value, "Cantidad de respuestas"];
                return [value, name];
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Bar 
              dataKey="promedio" 
              fill="hsl(var(--destructive))" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-sm text-muted-foreground">
        * Escala del 1 al 10 (1 = Sin dolor, 10 = Dolor extremo) | Ordenado por mayor promedio de dolor
      </div>
    </div>
  );
};