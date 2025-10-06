
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { DateRange } from "react-day-picker";
import { BarChart2, ClipboardList, Timer, Dumbbell, Ruler, Weight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PhysicalEvaluations() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showStats, setShowStats] = useState(false);
  
  // Get season and category from location state
  const seasonId = location.state?.seasonId;
  const categoryId = location.state?.categoryId;
  const seasonName = location.state?.seasonName;
  const categoryName = location.state?.categoryName;
  const seniorSeasonId = location.state?.seniorSeasonId;
  const seniorCategoryId = location.state?.seniorCategoryId;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <button
          onClick={() => navigate("/dashboard/physical", { 
            state: { 
              fromEvaluations: true,
              selectedSeason: seasonId,
              selectedCategory: categoryId,
              seasonName: seasonName,
              categoryName: categoryName,
              maintainView: true // Add this flag to indicate we want to maintain the current view
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

        <div className="flex items-center gap-2 mb-6">
          <ClipboardList className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Evaluaciones Físicas</h1>
        </div>

        <div className="relative mb-6">
          {dateRange && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 z-10"
              onClick={() => setShowStats(true)}
            >
              <BarChart2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Speed Card */}
          <Card 
            className={`hover:shadow-lg transition-shadow cursor-pointer h-60 ${
              location.pathname.includes('speed') ? "border-primary border-2" : ""
            }`}
            onClick={() => navigate("/dashboard/physical/evaluations/speed", {
              state: { 
                seasonId, 
                categoryId,
                seasonName,
                categoryName,
                seniorSeasonId,
                seniorCategoryId
              }
            })}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center h-full">
              <Timer className="h-16 w-16 mb-4 text-primary" />
              <h3 className="text-xl font-semibold text-center">Velocidad</h3>
              <p className="text-gray-500 text-center mt-2">Evaluación y seguimiento de la velocidad</p>
            </CardContent>
          </Card>

          {/* Resistance Card */}
          <Card 
            className={`hover:shadow-lg transition-shadow cursor-pointer h-60 ${
              location.pathname.includes('resistance') ? "border-primary border-2" : ""
            }`}
            onClick={() => navigate("/dashboard/physical/evaluations/resistance", {
              state: { 
                seasonId, 
                categoryId,
                seasonName,
                categoryName,
                seniorSeasonId,
                seniorCategoryId 
              }
            })}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center h-full">
              <Dumbbell className="h-16 w-16 mb-4 text-primary" />
              <h3 className="text-xl font-semibold text-center">Resistencia</h3>
              <p className="text-gray-500 text-center mt-2">Evaluación y seguimiento de resistencia física</p>
            </CardContent>
          </Card>

          {/* Anthropometry Card */}
          <Card 
            className={`hover:shadow-lg transition-shadow cursor-pointer h-60 ${
              location.pathname.includes('anthropometry') ? "border-primary border-2" : ""
            }`}
            onClick={() => navigate("/dashboard/physical/evaluations/anthropometry", {
              state: { 
                seasonId, 
                categoryId,
                seasonName,
                categoryName,
                seniorSeasonId,
                seniorCategoryId 
              }
            })}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center h-full">
              <Ruler className="h-16 w-16 mb-4 text-primary" />
              <h3 className="text-xl font-semibold text-center">Antropometría</h3>
              <p className="text-gray-500 text-center mt-2">Medidas y composición corporal</p>
            </CardContent>
          </Card>

          {/* Force Card */}
          <Card 
            className={`hover:shadow-lg transition-shadow cursor-pointer h-60 ${
              location.pathname.includes('force') ? "border-primary border-2" : ""
            }`}
            onClick={() => navigate("/dashboard/physical/evaluations/force", {
              state: { 
                seasonId, 
                categoryId,
                seasonName,
                categoryName,
                seniorSeasonId,
                seniorCategoryId 
              }
            })}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center h-full">
              <Weight className="h-16 w-16 mb-4 text-primary" />
              <h3 className="text-xl font-semibold text-center">Fuerza</h3>
              <p className="text-gray-500 text-center mt-2">Evaluación y seguimiento de fuerza</p>
            </CardContent>
          </Card>
        </div>

        <Dialog open={showStats} onOpenChange={setShowStats}>
          <DialogContent className="sm:max-w-[725px]">
            <DialogHeader>
              <DialogTitle>Estadísticas</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <p className="text-gray-500">
                El contenido de las estadísticas se agregará próximamente...
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
