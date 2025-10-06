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

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

interface SpeedDataListProps {
  dateRange?: DateRange;
  showStats?: boolean;
  setShowStats?: (show: boolean) => void;
  showPlayerStats?: boolean;
  setShowPlayerStats?: (show: boolean) => void;
  selectedStatColumn?: string | null;
  handleStatColumnChange?: (column: string) => void;
  searchTerm: string;
  onSuggestionsChange: (suggestions: string[]) => void;
  seasonId?: string;
  categoryId?: string;
  seniorSeasonId?: string;
  seniorCategoryId?: string;
}

export const SpeedDataList = ({
  dateRange,
  showStats,
  setShowStats,
  showPlayerStats,
  setShowPlayerStats,
  selectedStatColumn,
  handleStatColumnChange,
  searchTerm,
  onSuggestionsChange,
  seasonId,
  categoryId,
  seniorSeasonId,
  seniorCategoryId,
}: SpeedDataListProps) => {
  const { toast } = useToast();
  const [selectedDataset, setSelectedDataset] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [selectedChartColumn, setSelectedChartColumn] = useState<string | null>(null);
  const [saveConfirmationOpen, setSaveConfirmationOpen] = useState(false);
  const [tempDataset, setTempDataset] = useState<any>(null);

  const { data: datasets = [], refetch } = useQuery({
    queryKey: ["speed-datasets", dateRange, seasonId, categoryId, seniorSeasonId, seniorCategoryId],
    queryFn: async () => {
      // Obtener organización del usuario actual para filtrar por organización
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user?.id)
        .single();

      let query: any = supabase
        .from("speed_datasets")
        .select("*")
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
    const { error } = await supabase
      .from("speed_datasets")
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
    const { error } = await supabase
      .from("speed_datasets")
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

  if (!datasets?.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No hay datasets guardados
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Datasets Guardados</h3>

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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-gray-100"
                              onClick={() => handleDeleteColumn(header)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
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
              <DialogFooter>
                <Button onClick={handleSaveChanges} variant="outline" size="sm" className="gap-2">
                  <Save className="h-4 w-4" />
                  Guardar cambios
                </Button>
              </DialogFooter>
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
