
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { ForceExcelUploader } from "@/components/physical/ForceExcelUploader";
import { ForceDataList } from "@/components/physical/ForceDataList";
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

export default function ForceEvaluation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [measurementDateRange, setMeasurementDateRange] = useState<DateRange | undefined>();
  const [fdDateRange, setFdDateRange] = useState<DateRange | undefined>();
  const [tsDateRange, setTsDateRange] = useState<DateRange | undefined>();
  
  const [measurementStartDate, setMeasurementStartDate] = useState("");
  const [measurementEndDate, setMeasurementEndDate] = useState("");
  const [fdStartDate, setFdStartDate] = useState("");
  const [fdEndDate, setFdEndDate] = useState("");
  const [tsStartDate, setTsStartDate] = useState("");
  const [tsEndDate, setTsEndDate] = useState("");
  
  const [measurementShowStats, setMeasurementShowStats] = useState(false);
  const [fdShowStats, setFdShowStats] = useState(false);
  const [tsShowStats, setTsShowStats] = useState(false);
  
  const [measurementSelectedStatColumn, setMeasurementSelectedStatColumn] = useState<string | null>(null);
  const [fdSelectedStatColumn, setFdSelectedStatColumn] = useState<string | null>(null);
  const [tsSelectedStatColumn, setTsSelectedStatColumn] = useState<string | null>(null);

  const [measurementSearchTerm, setMeasurementSearchTerm] = useState("");
  const [fdSearchTerm, setFdSearchTerm] = useState("");
  const [tsSearchTerm, setTsSearchTerm] = useState("");

  const [measurementSuggestions, setMeasurementSuggestions] = useState<string[]>([]);
  const [fdSuggestions, setFdSuggestions] = useState<string[]>([]);
  const [tsSuggestions, setTsSuggestions] = useState<string[]>([]);

  const [showMeasurementSuggestions, setShowMeasurementSuggestions] = useState(false);
  const [showFdSuggestions, setShowFdSuggestions] = useState(false);
  const [showTsSuggestions, setShowTsSuggestions] = useState(false);

  const [showMeasurementPlayerStats, setShowMeasurementPlayerStats] = useState(false);
  const [showFdPlayerStats, setShowFdPlayerStats] = useState(false);
  const [showTsPlayerStats, setShowTsPlayerStats] = useState(false);

  const { toast } = useToast();
  const { getGradientClasses } = useOrganizationTheme();

  // Get season and category from location state
  const seasonId = location.state?.seasonId;
  const categoryId = location.state?.categoryId;
  const seniorSeasonId = location.state?.seniorSeasonId;
  const seniorCategoryId = location.state?.seniorCategoryId;

  const handleSearch = (startDate: string, endDate: string, setDateRange: (range: DateRange) => void) => {
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
          onClick={() => navigate("/dashboard/physical/evaluations")}
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

        <h1 className="text-2xl font-bold mb-4">Evaluación de Fuerza</h1>

        <div className="flex gap-4 mb-6">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              location.pathname.endsWith('force')
                ? 'bg-gradient-to-br ' + getGradientClasses('primary') + ' text-white'
                : 'text-muted-foreground'
            } flex items-center gap-2`}
            onClick={() => navigate("/dashboard/physical/evaluations/force", { state: { seasonId, categoryId, seniorSeasonId, seniorCategoryId } })}
          >
            Medición de Fuerza
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              location.pathname.includes('fd')
                ? 'bg-gradient-to-br ' + getGradientClasses('primary') + ' text-white'
                : 'text-muted-foreground'
            } flex items-center gap-2`}
            onClick={() => navigate("/dashboard/physical/evaluations/force/fd", { state: { seasonId, categoryId, seniorSeasonId, seniorCategoryId } })}
          >
            FD
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              location.pathname.includes('ts')
                ? 'bg-gradient-to-br ' + getGradientClasses('primary') + ' text-white'
                : 'text-muted-foreground'
            } flex items-center gap-2`}
            onClick={() => navigate("/dashboard/physical/evaluations/force/ts", { state: { seasonId, categoryId, seniorSeasonId, seniorCategoryId } })}
          >
            TS
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {location.pathname.endsWith('force') && (
            <div className="space-y-8">
              <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Desde
                    </label>
                    <Input
                      type="date"
                      value={measurementStartDate}
                      onChange={(e) => setMeasurementStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hasta
                    </label>
                    <Input
                      type="date"
                      value={measurementEndDate}
                      onChange={(e) => setMeasurementEndDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => handleSearch(measurementStartDate, measurementEndDate, setMeasurementDateRange)}
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
                      value={measurementSearchTerm}
                      onChange={(e) => {
                        setMeasurementSearchTerm(e.target.value);
                        setShowMeasurementSuggestions(true);
                      }}
                      onFocus={() => setShowMeasurementSuggestions(true)}
                      placeholder="Buscar jugador..."
                      className="w-full"
                    />
                    {measurementSuggestions.length > 0 && measurementSearchTerm && showMeasurementSuggestions && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                        {measurementSuggestions
                          .filter(name => 
                            normalizeText(name).includes(normalizeText(measurementSearchTerm))
                          )
                          .map((suggestion, index) => (
                            <div
                              key={index}
                              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                              onClick={() => {
                                setMeasurementSearchTerm(suggestion);
                                setShowMeasurementSuggestions(false);
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
                  <ForceExcelUploader seasonId={seasonId} categoryId={categoryId} seniorSeasonId={seniorSeasonId} seniorCategoryId={seniorCategoryId} />
                  {measurementDateRange && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMeasurementShowStats(true)}
                      >
                        <BarChart2 className="h-4 w-4" />
                      </Button>
                      {measurementSearchTerm && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowMeasurementPlayerStats(true)}
                        >
                          <User className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <ForceDataList
                  dateRange={measurementDateRange}
                  showStats={measurementShowStats}
                  setShowStats={setMeasurementShowStats}
                  selectedStatColumn={measurementSelectedStatColumn}
                  handleStatColumnChange={setMeasurementSelectedStatColumn}
                  showPlayerStats={showMeasurementPlayerStats}
                  setShowPlayerStats={setShowMeasurementPlayerStats}
                  searchTerm={measurementSearchTerm}
                  onSuggestionsChange={setMeasurementSuggestions}
                  type="MEASUREMENT"
                  seasonId={seasonId}
                  categoryId={categoryId}
                  seniorSeasonId={seniorSeasonId}
                  seniorCategoryId={seniorCategoryId}
                />
              </div>
            </div>
          )}

          {location.pathname.includes('fd') && (
            <div className="space-y-8">
              <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Desde
                    </label>
                    <Input
                      type="date"
                      value={fdStartDate}
                      onChange={(e) => setFdStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hasta
                    </label>
                    <Input
                      type="date"
                      value={fdEndDate}
                      onChange={(e) => setFdEndDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => handleSearch(fdStartDate, fdEndDate, setFdDateRange)}
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
                      value={fdSearchTerm}
                      onChange={(e) => {
                        setFdSearchTerm(e.target.value);
                        setShowFdSuggestions(true);
                      }}
                      onFocus={() => setShowFdSuggestions(true)}
                      placeholder="Buscar jugador..."
                      className="w-full"
                    />
                    {fdSuggestions.length > 0 && fdSearchTerm && showFdSuggestions && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                        {fdSuggestions
                          .filter(name => 
                            normalizeText(name).includes(normalizeText(fdSearchTerm))
                          )
                          .map((suggestion, index) => (
                            <div
                              key={index}
                              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                              onClick={() => {
                                setFdSearchTerm(suggestion);
                                setShowFdSuggestions(false);
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
                  <ForceExcelUploader seasonId={seasonId} categoryId={categoryId} seniorSeasonId={seniorSeasonId} seniorCategoryId={seniorCategoryId} />
                  {fdDateRange && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFdShowStats(true)}
                      >
                        <BarChart2 className="h-4 w-4" />
                      </Button>
                      {fdSearchTerm && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowFdPlayerStats(true)}
                        >
                          <User className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <ForceDataList
                  dateRange={fdDateRange}
                  showStats={fdShowStats}
                  setShowStats={setFdShowStats}
                  selectedStatColumn={fdSelectedStatColumn}
                  handleStatColumnChange={setFdSelectedStatColumn}
                  showPlayerStats={showFdPlayerStats}
                  setShowPlayerStats={setShowFdPlayerStats}
                  searchTerm={fdSearchTerm}
                  onSuggestionsChange={setFdSuggestions}
                  type="FD"
                  seasonId={seasonId}
                  categoryId={categoryId}
                  seniorSeasonId={seniorSeasonId}
                  seniorCategoryId={seniorCategoryId}
                />
              </div>
            </div>
          )}

          {location.pathname.includes('ts') && (
            <div className="space-y-8">
              <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Desde
                    </label>
                    <Input
                      type="date"
                      value={tsStartDate}
                      onChange={(e) => setTsStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hasta
                    </label>
                    <Input
                      type="date"
                      value={tsEndDate}
                      onChange={(e) => setTsEndDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => handleSearch(tsStartDate, tsEndDate, setTsDateRange)}
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
                      value={tsSearchTerm}
                      onChange={(e) => {
                        setTsSearchTerm(e.target.value);
                        setShowTsSuggestions(true);
                      }}
                      onFocus={() => setShowTsSuggestions(true)}
                      placeholder="Buscar jugador..."
                      className="w-full"
                    />
                    {tsSuggestions.length > 0 && tsSearchTerm && showTsSuggestions && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                        {tsSuggestions
                          .filter(name => 
                            normalizeText(name).includes(normalizeText(tsSearchTerm))
                          )
                          .map((suggestion, index) => (
                            <div
                              key={index}
                              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                              onClick={() => {
                                setTsSearchTerm(suggestion);
                                setShowTsSuggestions(false);
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
                  <ForceExcelUploader seasonId={seasonId} categoryId={categoryId} seniorSeasonId={seniorSeasonId} seniorCategoryId={seniorCategoryId} />
                  {tsDateRange && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTsShowStats(true)}
                      >
                        <BarChart2 className="h-4 w-4" />
                      </Button>
                      {tsSearchTerm && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowTsPlayerStats(true)}
                        >
                          <User className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <ForceDataList
                  dateRange={tsDateRange}
                  showStats={tsShowStats}
                  setShowStats={setTsShowStats}
                  selectedStatColumn={tsSelectedStatColumn}
                  handleStatColumnChange={setTsSelectedStatColumn}
                  showPlayerStats={showTsPlayerStats}
                  setShowPlayerStats={setShowTsPlayerStats}
                  searchTerm={tsSearchTerm}
                  onSuggestionsChange={setTsSuggestions}
                  type="TS"
                  seasonId={seasonId}
                  categoryId={categoryId}
                  seniorSeasonId={seniorSeasonId}
                  seniorCategoryId={seniorCategoryId}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
