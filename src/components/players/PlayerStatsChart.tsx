
import { DataBarChart } from "@/components/physical/DataBarChart";

interface PlayerStatsChartProps {
  data: {
    name: string;
    valor: number;
  }[];
  title: string;
}

export const PlayerStatsChart = ({ data, title }: PlayerStatsChartProps) => {
  if (data.length === 0) return null;

  return (
    <div className="h-[300px] w-full">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <DataBarChart data={data} />
    </div>
  );
};
