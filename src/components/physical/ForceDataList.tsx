import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Trash2, Eye, BarChart, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "@/components/modals/DeleteConfirmationDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DataBarChart } from "./DataBarChart";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { DateRange } from "react-day-picker";
import * as XLSX from 'xlsx';
import { usePermissions } from "@/hooks/use-permissions";

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

interface ForceDataListProps {
  dateRange?: DateRange;
  showStats?: boolean;
  setShowStats?: (show: boolean) => void;
  showPlayerStats?: boolean;
  setShowPlayerStats?: (show: boolean) => void;
  selectedStatColumn?: string | null;
  handleStatColumnChange?: (column: string) => void;
  searchTerm: string;
  onSuggestionsChange: (suggestions: string[]) => void;
  type: "MEASUREMENT" | "FD" | "TS";
  seasonId?: string;
  categoryId?: string;
  seniorSeasonId?: string;
  seniorCategoryId?: string;
}

export const ForceDataList = ({
  dateRange,
  showStats,
  setShowStats,
  showPlayerStats,
  setShowPlayerStats,
  selectedStatColumn,
  handleStatColumnChange,
  searchTerm,
  onSuggestionsChange,
  type,
  seasonId,
  categoryId,
  seniorSeasonId,
  seniorCategoryId,
}: ForceDataListProps) => {
  const { toast } = useToast();
  const [selectedDataset, setSelectedDataset] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [selectedChartColumn, setSelectedChartColumn] = useState<string | null>(null);
  const [saveConfirmationOpen, setSaveConfirmationOpen] = useState(false);
  const [tempDataset, setTempDataset] = useState<any>(null);
  const { canEdit } = usePermissions();
  const hasEditPermission = canEdit('physical');

  const { data: datasets = [], refetch } = useQuery({
    queryKey: ["force-datasets", dateRange, type, seasonId, categoryId, seniorSeasonId, seniorCategoryId],
    queryFn: async () => {
      // Obtener organización del usuario actual para filtrar por organización
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user?.id)
        .single();

      let query: any = supabase
        .from("force_datasets")
        .select("*")
        .eq("type", type)
        .order("created_at", { ascending: false })
        .eq('organization_id', userData?.organization_id);

      // Filtrar por temporada/categoría juvenil o primer equipo
      if (seasonId) query = query.eq('season_id', seasonId);
      if (categoryId) query = query.eq('category_id', categoryId);
      if (seniorSeasonId) query = query.eq('senior_season_id', seniorSeasonId);
      if (seniorCategoryId) query = query.eq('senior_category_id', seniorCategoryId);

      if (dateRange?.from && dateRange?.to) {
        query = query
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const uniqueNames = new Set<string>();
        data.forEach(dataset => {
          if (dataset.data && Array.isArray(dataset.data)) {
            dataset.data.forEach((row: any) => {
              const name = row["name"] || row["Name"] || row["NOMBRE"] || row["Nombre"] || "";
              if (name && normalizeText(name).includes(normalizeText(searchTerm))) {
                uniqueNames.add(name);
              }
            });
          }
        });
        onSuggestionsChange(Array.from(uniqueNames));
      }

      return data;
    },
  });

  const calculateStats = (columnName: string, filterByPlayer: boolean = false) => {
    let values: number[] = [];
    let playerData: { value: number; name: string }[] = [];

    datasets.forEach(dataset => {
      if (dataset.data && Array.isArray(dataset.data)) {
        dataset.data.forEach((row: any) => {
          const playerName = row["name"] || row["Name"] || row["NOMBRE"] || row["Nombre"] || "";
          const normalizedPlayerName = normalizeText(playerName);
          const normalizedSearchTerm = normalizeText(searchTerm);

          if (!filterByPlayer || (filterByPlayer && normalizedPlayerName.includes(normalizedSearchTerm))) {
            const value = parseFloat(String(row[columnName]).replace(',', '.'));
            if (!isNaN(value)) {
              values.push(value);
              playerData.push({
                value,
                name: playerName
              });
            }
          }
        });
      }
    });

    if (values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    const maxPlayers = playerData
      .filter(p => p.value === max)
      .map(p => p.name);
    const minPlayers = playerData
      .filter(p => p.value === min)
      .map(p => p.name);

    return {
      sum: sum.toFixed(2),
      average: avg.toFixed(2),
      max: max.toFixed(2),
      maxPlayers,
      min: min.toFixed(2),
      minPlayers,
    };
  };

  const getUniqueColumns = () => {
    const columns = new Set<string>();
    datasets.forEach(dataset => {
      if (dataset.data && Array.isArray(dataset.data)) {
        dataset.data.forEach((row: any) => {
          Object.keys(row).forEach(key => {
            if (key !== "name" && key !== "Name" && key !== "NOMBRE" && key !== "Nombre") {
              columns.add(key);
            }
          });
        });
      }
    });
    return Array.from(columns);
  };

  const handleDelete = async (id: string) => {
    if (!hasEditPermission) {
      toast({
        variant: "destructive",
        title: "Permiso denegado",
        description: "No tienes permisos para eliminar datasets",
      });
      return;
    }

    const { error } = await supabase
      .from("force_datasets")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el dataset",
      });
      return;
    }

    toast({
      title: "Dataset eliminado",
      description: "El dataset se eliminó correctamente",
    });
    setDeleteDialogOpen(false);
    setDatasetToDelete(null);
    refetch();
  };

  const handleViewDataset = (dataset: any) => {
    const filteredData = dataset.data.filter((row: any) => {
      const playerName = row["name"] || row["Name"] || row["NOMBRE"] || row["Nombre"] || "";
      const normalizedPlayerName = normalizeText(playerName);
      const normalizedSearchTerm = normalizeText(searchTerm);
      return !searchTerm || normalizedPlayerName.includes(normalizedSearchTerm);
    });

    setSelectedDataset({
      ...dataset,
      data: filteredData
    });
    setTempDataset(JSON.parse(JSON.stringify({ ...dataset, data: filteredData }))); // Deep copy
    setShowViewDialog(true);
  };

  const handleShowChart = (header: string) => {
    setSelectedChartColumn(header);
    setShowChart(true);
  };

  const handleDeleteColumn = (headerToDelete: string) => {
    if (!hasEditPermission) {
      toast({
        variant: "destructive",
        title: "Permiso denegado",
        description: "No tienes permisos para eliminar columnas",
      });
      return;
    }
    
    const newData = tempDataset.data.map((row: any) => {
      const newRow = { ...row };
      delete newRow[headerToDelete];
      return newRow;
    });

    const newColumnOrder = tempDataset.column_order.filter(
      (col: string) => col !== headerToDelete
    );

    setTempDataset({
      ...tempDataset,
      data: newData,
      column_order: newColumnOrder,
    });

    toast({
      title: "Columna eliminada",
      description: `Se eliminó la columna "${headerToDelete}"`,
    });
  };

  const handleSaveChanges = async () => {
    if (!hasEditPermission) {
      toast({
        variant: "destructive",
        title: "Permiso denegado",
        description: "No tienes permisos para guardar cambios",
      });
      return;
    }

    const { error } = await supabase
      .from("force_datasets")
      .update({ 
        data: tempDataset.data,
        column_order: tempDataset.column_order
      })
      .eq("id", tempDataset.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar los cambios",
      });
      return;
    }

    toast({
      title: "Cambios guardados",
      description: "Los cambios se guardaron correctamente",
    });
    setSaveConfirmationOpen(false);
    setShowViewDialog(false);
    refetch();
  };

  const handleDownloadExcel = async () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Agregar la hoja principal de datos
      const ws = XLSX.utils.json_to_sheet(selectedDataset.data);
      XLSX.utils.book_append_sheet(wb, ws, "Datos");

      // Procesar los datos de los porteros si hay alguno
      const allDataRows = selectedDataset.data;
      const goalkeepersData = allDataRows.filter((row: any) => {
        const playerName = row["name"] || row["Name"] || row["NOMBRE"] || row["Nombre"] || "";
        // Filtrar solo si es un portero y tiene datos de evaluación
        return row["position"] === "portero" || row["Posición"] === "portero";
      });

      if (goalkeepersData.length > 0) {
        const formattedGoalkeepersData = goalkeepersData.map((row: any) => {
          return {
            'Nombre': row["name"] || row["Name"] || row["NOMBRE"] || row["Nombre"] || "",
            'Fecha': row["date"] || row["Fecha"] || row["FECHA"] || "",
            'Comunicación - Adecuada (1-7)': row["Comunicación - Adecuada"] || row["comunicacion_adecuada"] || 1,
            'Comunicación - Preventiva (1-7)': row["Comunicación - Preventiva"] || row["comunicacion_preventiva"] || 1,
            'Lectura de Juego - Pasiva (1-7)': row["Lectura - Pasiva"] || row["lectura_pasiva"] || 1,
            'Lectura de Juego - Activa (1-7)': row["Lectura - Activa"] || row["lectura_activa"] || 1,
            'Despejes con Puños - Cantidad': row["Puños - Cantidad"] || row["punos_cantidad"] || 0,
            'Despejes con Puños - Calificación (1-7)': row["Puños - Calificación"] || row["punos_calificacion"] || 1,
            'Descuelgue - Cantidad': row["Descuelgue - Cantidad"] || row["descuelgue_cantidad"] || 0,
            'Descuelgue - Calificación (1-7)': row["Descuelgue - Calificación"] || row["descuelgue_calificacion"] || 1,
            'Duelos 1vs1 - Cantidad': row["1vs1 - Cantidad"] || row["uno_vs_uno_cantidad"] || 0,
            'Duelos 1vs1 - Calificación (1-7)': row["1vs1 - Calificación"] || row["uno_vs_uno_calificacion"] || 1,
            'Gol Rival (Riesgo Alto) - Cantidad': row["Gol Alto - Cantidad"] || row["gol_rival_alto_cantidad"] || 0,
            'Gol Rival (Riesgo Alto) - Calificación (1-7)': row["Gol Alto - Calificación"] || row["gol_rival_alto_calificacion"] || 1,
            'Gol Rival (Riesgo Medio) - Cantidad': row["Gol Medio - Cantidad"] || row["gol_rival_medio_cantidad"] || 0,
            'Gol Rival (Riesgo Medio) - Calificación (1-7)': row["Gol Medio - Calificación"] || row["gol_rival_medio_calificacion"] || 1,
            'Pie (Defensivo) - Control de Balón (1-7)': row["Pie Defensivo - Control"] || row["pie_defensivo_controles"] || 1,
            'Pie (Defensivo) - Continuidad en el Juego (1-7)': row["Pie Defensivo - Continuidad"] || row["pie_defensivo_continuidad"] || 1,
            'Pie (Ofensivo) - Inicio de Jugada (1-7)': row["Pie Ofensivo - Inicio"] || row["pie_ofensivo_inicio"] || 1,
            'Pie (Ofensivo) - Pases de Salteo (1-7)': row["Pie Ofensivo - Salteo"] || row["pie_ofensivo_salteo"] || 1,
            'Pie (Ofensivo) - Asistencias (1-7)': row["Pie Ofensivo - Asistencias"] || row["pie_ofensivo_asistencias"] || 1,
          };
        });

        // Agregar la hoja de porteros
        const wsGoalkeepers = XLSX.utils.json_to_sheet(formattedGoalkeepersData);
        XLSX.utils.book_append_sheet(wb, wsGoalkeepers, "Porteros");
      }

      const fileName = `force_data_${type.toLowerCase()}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Éxito",
        description: "Excel descargado correctamente",
      });
    } catch (error) {
      console.error('Error downloading excel:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo descargar el excel",
      });
    }
  };

  const average = (numbers: number[]) => {
    if (numbers.length === 0) return 0;
    return Number((numbers.reduce((a, b) => a + b, 0) / numbers.length).toFixed(2));
  };

  const sum = (numbers: number[]) => {
    return numbers.reduce((a, b) => a + b, 0);
  };

  if (!datasets?.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No hay datasets guardados
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="sm:max-w-[725px]">
          <DialogHeader>
            <DialogTitle>Estadísticas Generales</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Selecciona una columna:</label>
              <Select onValueChange={handleStatColumnChange} value={selectedStatColumn || undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una columna" />
                </SelectTrigger>
                <SelectContent>
                  {getUniqueColumns().map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStatColumn && (
              <div className="grid grid-cols-2 gap-4">
                {calculateStats(selectedStatColumn, false) && (
                  <>
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Sumatoria</h4>
                      <p className="text-2xl font-bold">
                        {calculateStats(selectedStatColumn, false)?.sum}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Promedio</h4>
                      <p className="text-2xl font-bold">
                        {calculateStats(selectedStatColumn, false)?.average}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Valor más alto</h4>
                      <p className="text-2xl font-bold">
                        {calculateStats(selectedStatColumn, false)?.max}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        ({calculateStats(selectedStatColumn, false)?.maxPlayers.join(", ")})
                      </p>
                    </Card>
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Valor más bajo</h4>
                      <p className="text-2xl font-bold">
                        {calculateStats(selectedStatColumn, false)?.min}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        ({calculateStats(selectedStatColumn, false)?.minPlayers.join(", ")})
                      </p>
                    </Card>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPlayerStats} onOpenChange={setShowPlayerStats}>
        <DialogContent className="sm:max-w-[725px]">
          <DialogHeader>
            <DialogTitle>Estadísticas del Jugador: {searchTerm}</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Selecciona una columna:</label>
              <Select onValueChange={handleStatColumnChange} value={selectedStatColumn || undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una columna" />
                </SelectTrigger>
                <SelectContent>
                  {getUniqueColumns().map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStatColumn && (
              <div className="grid grid-cols-2 gap-4">
                {calculateStats(selectedStatColumn, true) && (
                  <>
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Sumatoria</h4>
                      <p className="text-2xl font-bold">
                        {calculateStats(selectedStatColumn, true)?.sum}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Promedio</h4>
                      <p className="text-2xl font-bold">
                        {calculateStats(selectedStatColumn, true)?.average}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Valor más alto</h4>
                      <p className="text-2xl font-bold">
                        {calculateStats(selectedStatColumn, true)?.max}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Valor más bajo</h4>
                      <p className="text-2xl font-bold">
                        {calculateStats(selectedStatColumn, true)?.min}
                      </p>
                    </Card>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {datasets.map((dataset) => (
          <div
            key={dataset.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">{dataset.name}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(dataset.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleViewDataset(dataset)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              {hasEditPermission && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setDatasetToDelete(dataset.id);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDatasetToDelete(null);
        }}
        onConfirm={() => datasetToDelete && handleDelete(datasetToDelete)}
        title="¿Estás seguro?"
        description="Esta acción no se puede deshacer. El dataset será eliminado permanentemente."
      />

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dataset: {selectedDataset?.name}</DialogTitle>
          </DialogHeader>
          {selectedDataset && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectedDataset.column_order.map((header: string) => (
                      <TableHead key={header} className="relative pr-8">
                        <div className="flex items-center justify-between">
                          <span className="mr-6">{header}</span>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                            {hasEditPermission && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-gray-100"
                                onClick={() => handleDeleteColumn(header)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-gray-100"
                              onClick={() => handleShowChart(header)}
                            >
                              <BarChart className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDataset.data.map((row: any, index: number) => (
                    <TableRow key={index}>
                      {selectedDataset.column_order.map((header: string) => (
                        <TableCell key={header}>{row[header]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {hasEditPermission && (
                <DialogFooter>
                  <Button onClick={handleSaveChanges} variant="outline" size="sm" className="gap-2">
                    <Save className="h-4 w-4" />
                    Guardar cambios
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showChart} onOpenChange={setShowChart}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gráfico de {selectedChartColumn}</DialogTitle>
          </DialogHeader>
          <div className="h-[500px] w-full">
            <DataBarChart 
              data={selectedChartColumn && selectedDataset ? selectedDataset.data.map((row: any) => ({
                valor: parseFloat(row[selectedChartColumn]?.toString().replace(",", ".")) || 0,
                name: row["name"] || row["Name"] || row["NOMBRE"] || row["Nombre"] || "Sin nombre"
              })) : []} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
