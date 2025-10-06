
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BarChart2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

interface DateRangeSearchProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onSearch: () => void;
  showStats?: boolean;
  setShowStats?: (show: boolean) => void;
  dateRange?: DateRange;
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
}

export const DateRangeSearch = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onSearch,
  showStats,
  setShowStats,
  dateRange,
  searchTerm = "",
  onSearchTermChange = () => {}
}: DateRangeSearchProps) => {
  const { getGradientClasses } = useOrganizationTheme();
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchTermChange(e.target.value);
  };

  return (
    <div className="space-y-4">
      <div>
        <Input
          type="text"
          placeholder="Buscar por nombre del jugador..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="max-w-md"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Desde
          </label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hasta
          </label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={onSearch}
            className={`relative bg-gradient-to-br ${getGradientClasses('primary')} border-2 border-border/30 rounded-xl p-2.5 ${getGradientClasses('hover')} transition-all duration-300 shadow-2xl transform hover:scale-105 hover:shadow-lg gap-2 w-full`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
            <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
            <div className="relative flex items-center justify-center gap-2">
              <Search className="w-4 h-4 text-primary-foreground" />
              <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                Buscar
              </span>
            </div>
          </Button>
        </div>
      </div>
      {dateRange && setShowStats && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowStats(!showStats)}
          >
            <BarChart2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
