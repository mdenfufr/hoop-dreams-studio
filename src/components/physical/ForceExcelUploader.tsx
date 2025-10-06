
import { useState } from "react";
import { useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, BarChart, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";

interface DynamicData {
  [key: string]: string | number;
}

interface ForceExcelUploaderProps {
  seasonId?: string;
  categoryId?: string;
  seniorSeasonId?: string;
  seniorCategoryId?: string;
}

export const ForceExcelUploader = ({
  seasonId,
  categoryId,
  seniorSeasonId,
  seniorCategoryId,
}: ForceExcelUploaderProps) => {
  const [excelData, setExcelData] = useState<DynamicData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [datasetName, setDatasetName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const { canEdit } = usePermissions();
  const hasEditPermission = canEdit('physical');
  const { getGradientClasses } = useOrganizationTheme();

  const getCurrentDatasetType = () => {
    if (location.pathname.includes('/fd')) return 'FD';
    if (location.pathname.includes('/ts')) return 'TS';
    return 'MEASUREMENT';
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
        const headers: string[] = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: C })];
          headers.push(cell?.v?.toString().trim() || `Column ${C + 1}`);
        }

        const rawData = XLSX.utils.sheet_to_json(worksheet, {
          header: headers,
          raw: false,
          defval: "",
        });

        const processedData = rawData.slice(1).map((row: any) => {
          const orderedRow: DynamicData = {};
          headers.forEach((header) => {
            orderedRow[header] = row[header] !== undefined ? row[header] : "";
          });
          return orderedRow;
        });

        setHeaders(headers);
        setExcelData(processedData);

        toast({
          title: "Excel cargado correctamente",
          description: `Se encontraron ${processedData.length} registros con ${headers.length} columnas`,
        });
      } catch (error) {
        console.error("Error al procesar el archivo:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error al procesar el archivo Excel",
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDeleteColumn = (headerToDelete: string) => {
    const newHeaders = headers.filter((header) => header !== headerToDelete);
    const newData = excelData.map((row) => {
      const newRow = { ...row };
      delete newRow[headerToDelete];
      return newRow;
    });

    setHeaders(newHeaders);
    setExcelData(newData);

    toast({
      title: "Columna eliminada",
      description: `Se eliminó la columna "${headerToDelete}"`,
    });
  };

  const handleShowChart = (header: string) => {
    setSelectedColumn(header);
    setShowChart(true);
  };

  const handleSaveDataset = async () => {
    if (!datasetName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor ingresa un nombre para el conjunto de datos",
      });
      return;
    }

    // Obtener la organización del usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user?.id)
      .single();

    const { error } = await supabase.from("force_datasets").insert({
      name: datasetName,
      data: excelData,
      column_order: headers,
      type: getCurrentDatasetType(),
      organization_id: userData?.organization_id,
      season_id: seasonId || null,
      category_id: categoryId || null,
      senior_season_id: seniorSeasonId || null,
      senior_category_id: seniorCategoryId || null,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el dataset",
      });
      return;
    }

    toast({
      title: "Éxito",
      description: `Dataset "${datasetName}" guardado correctamente`,
    });
    setDatasetName("");
    setExcelData([]);
    setHeaders([]);
    queryClient.invalidateQueries({ queryKey: ["force-datasets"] });
  };

  const prepareChartData = (columnName: string) => {
    return excelData.map((row) => ({
      valor: parseFloat(row[columnName]?.toString().replace(",", ".")),
      name: row["name"] || row["Name"] || row["NOMBRE"] || row["Nombre"] || "Sin nombre"
    }));
  };

  return (
    <div>
      {hasEditPermission && (
        <div className="flex gap-4 mb-6 items-center">
          <label className={`relative bg-gradient-to-br ${getGradientClasses('primary')} border-2 border-border/30 rounded-xl p-2.5 ${getGradientClasses('hover')} transition-all duration-300 shadow-2xl transform hover:scale-105 hover:shadow-lg gap-2 cursor-pointer flex items-center justify-center`}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
            <div className="absolute inset-0 bg-primary/10 rounded-xl backdrop-blur-sm"></div>
            <div className="relative flex items-center justify-center gap-2">
              <Upload className="h-4 w-4 text-primary-foreground" />
              <span className="text-sm font-rajdhani font-semibold uppercase tracking-wider text-primary-foreground">
                Cargar Excel
              </span>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          {excelData.length > 0 && (
            <>
              <Input
                placeholder="Nombre del conjunto de datos"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={handleSaveDataset} className={`bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border hover:shadow-lg`}>Guardar</Button>
            </>
          )}
        </div>
      )}

      {excelData.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header, index) => (
                  <TableHead key={index} className="relative pr-8">
                    <div className="flex items-center justify-between">
                      <span className="mr-6">{header}</span>
                      {hasEditPermission && (
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
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {excelData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {headers.map((header, colIndex) => (
                    <TableCell key={`${rowIndex}-${colIndex}`}>
                      {row[header]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showChart} onOpenChange={setShowChart}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Gráfico de {selectedColumn}</DialogTitle>
          </DialogHeader>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={selectedColumn ? prepareChartData(selectedColumn) : []}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis hide={true} />
                <YAxis />
                <Tooltip
                  formatter={(value: number, name: string) => [value, "Valor"]}
                  labelFormatter={(index: number) => {
                    const data = selectedColumn ? prepareChartData(selectedColumn) : [];
                    return data[index]?.name || 'Sin nombre';
                  }}
                />
                <Bar dataKey="valor" fill="#60A5FA" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
