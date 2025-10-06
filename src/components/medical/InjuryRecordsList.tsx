import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { DeleteConfirmationDialog } from "@/components/modals/DeleteConfirmationDialog";
import { EditInjuryRecordModal } from "@/components/medical/EditInjuryRecordModal";
import { Eye, Trash2, Shield, ShieldX, Edit } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InjuryRecord {
  id: string;
  date: string;
  injury_description: string;
  recommended_treatment: string;
  is_active: boolean;
}

interface InjuryRecordsListProps {
  playerId: string;
}

export function InjuryRecordsList({ playerId }: InjuryRecordsListProps) {
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<InjuryRecord | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<InjuryRecord | null>(null);
  const queryClient = useQueryClient();
  const { canEdit } = usePermissions();

  const { data: records = [], refetch } = useQuery({
    queryKey: ["injury-records", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("injury_records")
        .select("*")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los registros de lesiones",
        });
        return [];
      }

      return data?.map((record: any) => ({
        ...record,
        is_active: record.is_active ?? true // Default to true if column doesn't exist yet
      })) as InjuryRecord[];
    },
  });

  const handleDelete = async () => {
    if (!recordToDelete) return;

    const { error } = await supabase
      .from("injury_records")
      .delete()
      .eq("id", recordToDelete);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el registro",
      });
    } else {
      toast({
        title: "Registro eliminado",
        description: "El registro ha sido eliminado exitosamente",
      });
      
      // Invalidate both injury records and injured players count queries
      queryClient.invalidateQueries({ queryKey: ["injury-records", playerId] });
      queryClient.invalidateQueries({ queryKey: ["injuredPlayersCount"] });
    }

    setRecordToDelete(null);
  };

  const handleToggleStatus = async (recordId: string, currentStatus: boolean) => {
    // Optimistically update the cache
    queryClient.setQueryData(["injury-records", playerId], (oldData: InjuryRecord[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map(record => 
        record.id === recordId 
          ? { ...record, is_active: !currentStatus }
          : record
      );
    });

    const { error } = await supabase
      .from("injury_records")
      .update({ is_active: !currentStatus } as any)
      .eq("id", recordId);

    if (error) {
      // Revert the optimistic update on error
      queryClient.setQueryData(["injury-records", playerId], (oldData: InjuryRecord[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(record => 
          record.id === recordId 
            ? { ...record, is_active: currentStatus }
            : record
        );
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado de la lesión",
      });
    } else {
      // Invalidate injured players count queries to update counters
      queryClient.invalidateQueries({ queryKey: ["injuredPlayersCount"] });
      
      toast({
        title: "Estado actualizado",
        description: `La lesión se ha marcado como ${!currentStatus ? 'activa' : 'inactiva'}`,
      });
    }
  };

  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay registros de lesiones para este jugador
      </div>
    );
  }

  return (
    <div className="mt-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Descripción de la lesión</TableHead>
            <TableHead>Tratamiento recomendado</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-[160px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
              <TableCell className="max-w-[200px]">
                <div className="truncate" title={record.injury_description}>
                  {record.injury_description.length > 80 
                    ? `${record.injury_description.substring(0, 80)}...` 
                    : record.injury_description}
                </div>
              </TableCell>
              <TableCell className="max-w-[200px]">
                <div className="truncate" title={record.recommended_treatment}>
                  {record.recommended_treatment.length > 80 
                    ? `${record.recommended_treatment.substring(0, 80)}...` 
                    : record.recommended_treatment}
                </div>
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  record.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {record.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedRecord(record)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleStatus(record.id, record.is_active)}
                    className={record.is_active 
                      ? "text-red-600 hover:text-red-800" 
                      : "text-green-600 hover:text-green-800"
                    }
                  >
                    {record.is_active ? <ShieldX className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                  </Button>
                  {canEdit("medical_staff") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRecordToDelete(record.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <DeleteConfirmationDialog
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar registro"
        description="¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer."
      />

      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles de la lesión</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 z-10"
              onClick={() => {
                setRecordToEdit(selectedRecord);
                setEditModalOpen(true);
                setSelectedRecord(null);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <div>
              <h3 className="font-medium mb-1">Fecha</h3>
              <p>{selectedRecord && new Date(selectedRecord.date).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Descripción de la lesión</h3>
              <p className="whitespace-pre-wrap break-words cursor-text">{selectedRecord?.injury_description}</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Tratamiento recomendado</h3>
              <p className="whitespace-pre-wrap break-words cursor-text">{selectedRecord?.recommended_treatment}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EditInjuryRecordModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setRecordToEdit(null);
        }}
        injuryRecord={recordToEdit}
        playerId={playerId}
      />
    </div>
  );
}