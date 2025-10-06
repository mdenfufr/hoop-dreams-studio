import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

interface WellnessData {
  sleep_quality: number;
  muscle_soreness: number;
  fatigue_level: number;
  stress_level: number;
}

interface WellnessBarChartProps {
  data: WellnessData[];
  dateRange?: { from: Date | null; to: Date | null };
}

export function WellnessBarChart({ data }: WellnessBarChartProps) {
  console.log('WellnessBarChart - datos recibidos:', data);
  
  // Calcular promedios de las 4 preguntas
  const calculateAverages = () => {
    if (data.length === 0) {
      console.log('No hay datos para mostrar en el gráfico');
      return [];
    }

    // Agrupar por jugador primero
    const playerAverages = data.reduce((acc: any, item: any) => {
      const playerId = item.player_id || item.players?.id;
      if (!playerId) return acc;

      if (!acc[playerId]) {
        acc[playerId] = {
          sleep_values: [],
          muscle_values: [],
          fatigue_values: [],
          stress_values: []
        };
      }

      acc[playerId].sleep_values.push(item.sleep_quality || 0);
      acc[playerId].muscle_values.push(item.muscle_soreness || 0);
      acc[playerId].fatigue_values.push(item.fatigue_level || 0);
      acc[playerId].stress_values.push(item.stress_level || 0);

      return acc;
    }, {});

    console.log('Datos agrupados por jugador:', playerAverages);

    // Calcular promedio por jugador para cada variable
    const playerPromedioes = Object.entries(playerAverages).map(([playerId, player]: [string, any]) => {
      const sleepAvg = player.sleep_values.reduce((sum: number, val: number) => sum + val, 0) / player.sleep_values.length;
      const muscleAvg = player.muscle_values.reduce((sum: number, val: number) => sum + val, 0) / player.muscle_values.length;
      const fatigueAvg = player.fatigue_values.reduce((sum: number, val: number) => sum + val, 0) / player.fatigue_values.length;
      const stressAvg = player.stress_values.reduce((sum: number, val: number) => sum + val, 0) / player.stress_values.length;

      console.log(`Jugador ${playerId}:`, {
        sleep: sleepAvg,
        muscle: muscleAvg,
        fatigue: fatigueAvg,
        stress: stressAvg
      });

      return {
        sleep: sleepAvg,
        muscle: muscleAvg,
        fatigue: fatigueAvg,
        stress: stressAvg
      };
    });

    if (playerPromedioes.length === 0) {
      return [];
    }

    console.log('Promedios individuales por jugador:', playerPromedioes);

    // Calcular promedio final de los promedios de jugadores
    const finalAverages = playerPromedioes.reduce(
      (acc, playerAvg) => ({
        sleep: acc.sleep + playerAvg.sleep,
        muscle: acc.muscle + playerAvg.muscle,
        fatigue: acc.fatigue + playerAvg.fatigue,
        stress: acc.stress + playerAvg.stress,
      }),
      { sleep: 0, muscle: 0, fatigue: 0, stress: 0 }
    );

    const playerCount = playerPromedioes.length;
    
    console.log('Promedios finales antes de dividir:', finalAverages);
    console.log('Número de jugadores:', playerCount);

    return [
      { 
        pregunta: 'Calidad del Sueño', 
        promedio: Number((finalAverages.sleep / playerCount).toFixed(1)) 
      },
      { 
        pregunta: 'Dolor Muscular', 
        promedio: Number((finalAverages.muscle / playerCount).toFixed(1)) 
      },
      { 
        pregunta: 'Nivel de Fatiga', 
        promedio: Number((finalAverages.fatigue / playerCount).toFixed(1)) 
      },
      { 
        pregunta: 'Nivel de Estrés', 
        promedio: Number((finalAverages.stress / playerCount).toFixed(1)) 
      },
    ];
  };

  const chartData = calculateAverages();

  // Si no hay datos, mostrar mensaje
  if (data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500 text-center">
          No hay datos de wellness disponibles<br />
          <span className="text-sm">Los datos aparecerán cuando se registren respuestas de wellness</span>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="pregunta" 
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={12}
          />
          <YAxis 
            domain={[0, 10]}
            fontSize={12}
          />
          <Tooltip 
            formatter={(value) => [`${value}/10`, 'Promedio']}
            labelStyle={{ color: '#374151' }}
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '6px' 
            }}
          />
          <Bar 
            dataKey="promedio" 
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            maxBarSize={60}
          >
            <LabelList 
              dataKey="promedio" 
              position="top"
              fontSize={12}
              fill="#374151"
              fontWeight="bold"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}