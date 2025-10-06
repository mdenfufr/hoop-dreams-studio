
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { ExcelUploader } from "@/components/physical/ExcelUploader";
import { GPSDataList } from "@/components/physical/GPSDataList";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { BarChart2, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

export default function PhysicalLoadControl() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [showPlayerStats, setShowPlayerStats] = useState(false);
  const [selectedStatColumn, setSelectedStatColumn] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { getGradientClasses } = useOrganizationTheme();

  // Get season and category from location state
  const seasonId = location.state?.seasonId;
  const categoryId = location.state?.categoryId;
  const seasonName = location.state?.seasonName;
  const categoryName = location.state?.categoryName;
  const seniorSeasonId = location.state?.seniorSeasonId;
  const seniorCategoryId = location.state?.seniorCategoryId;

  const handleStatColumnChange = (column: string) => {
    setSelectedStatColumn(column);
  };

  const handleSearch = () => {
    if (!startDate || !endDate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor selecciona las fechas desde y hasta",
      });
      return;
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);

    if (end < start) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La fecha final no puede ser anterior a la fecha inicial",
      });
      return;
    }

    setDateRange({
      from: start,
      to: end,
    });
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <button
          onClick={() => navigate("/dashboard/physical", { 
            state: { 
              fromLoadControl: true,
              selectedSeason: seasonId,
              selectedCategory: categoryId,
              seasonName: seasonName,
              categoryName: categoryName,
              seniorSeasonId: seniorSeasonId,
              seniorCategoryId: seniorCategoryId,
              maintainView: true // Add this flag to maintain the view
            } 
          })}
          className="mb-6 flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Volver
        </button>

        <h1 className="text-2xl font-bold mb-4">Control de Carga</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-8">
          <div className="flex flex-col space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desde
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSearch}
                  className={`relative bg-gradient-to-br ${getGradientClasses('primary')} border-2 border-border/30 rounded-xl p-2.5 ${getGradientClasses('hover')} transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2 w-full`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                  <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
                  <div className="relative flex items-center justify-center gap-2">
                    <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                      Buscar
                    </span>
                  </div>
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar Jugador
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Buscar jugador..."
                  className="w-full"
                />
                {suggestions.length > 0 && searchTerm && showSuggestions && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                    {suggestions
                      .filter(name => 
                        normalizeText(name).includes(normalizeText(searchTerm))
                      )
                      .map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                          onClick={() => {
                            setSearchTerm(suggestion);
                            setShowSuggestions(false);
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <ExcelUploader seasonId={seasonId} categoryId={categoryId} seniorSeasonId={seniorSeasonId} seniorCategoryId={seniorCategoryId} />
              {dateRange && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowStats(true)}
                  >
                    <BarChart2 className="h-4 w-4" />
                  </Button>
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPlayerStats(true)}
                    >
                      <User className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            <GPSDataList
              dateRange={dateRange}
              showStats={showStats}
              setShowStats={setShowStats}
              showPlayerStats={showPlayerStats}
              setShowPlayerStats={setShowPlayerStats}
              selectedStatColumn={selectedStatColumn}
              handleStatColumnChange={handleStatColumnChange}
              searchTerm={searchTerm}
              onSuggestionsChange={setSuggestions}
              seasonId={seasonId}
              categoryId={categoryId}
              seniorSeasonId={seniorSeasonId}
              seniorCategoryId={seniorCategoryId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
