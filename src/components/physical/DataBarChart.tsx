
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface ChartData {
  valor: number;
  name: string;
}

interface DataBarChartProps {
  data: ChartData[];
  color?: string;
}

export const DataBarChart = ({ data, color = "#60A5FA" }: DataBarChartProps) => {
  const calculateMean = (data: ChartData[]) => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, item) => acc + (isNaN(item.valor) ? 0 : item.valor), 0);
    return sum / data.length;
  };

  const mean = calculateMean(data);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{
          top: 20,
          right: 160,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis hide={true} />
        <YAxis />
        <Tooltip
          formatter={(value: number, name: string) => [value, "Valor"]}
          labelFormatter={(index: number) => data[index]?.name || 'Sin nombre'}
        />
        <ReferenceLine
          y={mean}
          stroke="#000"
          strokeWidth={2}
          label={{
            value: [
              `Media: ${mean.toFixed(2)}`,
              `(${data.length} valores)`
            ].join('\n'),
            position: 'right',
            fill: '#000',
            fontSize: 12
          }}
        />
        <Bar dataKey="valor" fill={color} />
      </BarChart>
    </ResponsiveContainer>
  );
};
