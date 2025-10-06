
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Eye, Trash2, Shield, ShieldX, Edit } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/modals/DeleteConfirmationDialog";
import { EditAilmentModal } from "@/components/medical/EditAilmentModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { usePermissions } from "@/hooks/use-permissions";


interface AilmentsListProps {
  playerId: string;
  hideStatusColumn?: boolean;
}

export function AilmentsList({ playerId, hideStatusColumn = false }: AilmentsListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAilmentId, setSelectedAilmentId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAilment, setSelectedAilment] = useState<{id: string, date: string, description: string} | null>(null);
  const [selectedAilmentForView, setSelectedAilmentForView] = useState<any | null>(null);
  const queryClient = useQueryClient();
  const { canEdit } = usePermissions();


  const { data: ailments = [], isLoading, isError } = useQuery({
    queryKey: ["ailments", playerId],
    queryFn: async () => {
      try {
        let query = supabase
          .from('ailments')
          .select('*')
          .order('date', { ascending: false });
        
        // Only filter by player_id if a valid playerId is provided
        if (playerId) {
          query = query.eq('player_id', playerId);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching ailments:", error);
          throw error;
        }
        return data || [];
      } catch (error) {
        console.error("Error in ailments query:", error);
        return [];
      }
    },
  });

  const toggleAilmentStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("ailments")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ailments", playerId] });
      queryClient.invalidateQueries({ queryKey: ["ailmentPlayersCount"] });
      toast({
        title: "Estado actualizado",
        description: "El estado de la dolencia ha sido actualizado correctamente",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado de la dolencia",
      });
    },
  });

  const handleDeleteAilment = async () => {
    if (!selectedAilmentId) return;

    try {
      const { error } = await supabase
        .from('ailments')
        .delete()
        .eq('id', selectedAilmentId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Registro de dolencia eliminado correctamente",
      });

      // Invalidate queries to update both list and counters
      queryClient.invalidateQueries({ queryKey: ["ailments", playerId] });
      queryClient.invalidateQueries({ queryKey: ["ailmentPlayersCount"] });
    } catch (error) {
      console.error("Error deleting ailment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el registro de dolencia",
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedAilmentId(null);
    }
  };

  const handleEditAilment = (ailment: any) => {
    setSelectedAilment({
      id: ailment.id,
      date: ailment.date,
      description: ailment.description
    });
    setEditModalOpen(true);
  };

  const openDeleteDialog = (ailmentId: string) => {
    setSelectedAilmentId(ailmentId);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-4">Cargando registros...</div>;
  }

  if (isError) {
    return <div className="text-center py-4 text-red-500">Error al cargar los registros</div>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha y Hora</TableHead>
            <TableHead>Descripción</TableHead>
            {!hideStatusColumn && <TableHead>Estado</TableHead>}
            <TableHead className="w-[160px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ailments.map((ailment) => (
            <TableRow key={ailment.id}>
              <TableCell>
                {format(new Date(ailment.date), "PPP 'a las' p", { locale: es })}
              </TableCell>
              <TableCell>{ailment.description}</TableCell>
              {!hideStatusColumn && (
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    ailment.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {ailment.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </TableCell>
              )}
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedAilmentForView(ailment)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleAilmentStatus.mutate({ 
                      id: ailment.id, 
                      isActive: !ailment.is_active 
                    })}
                    className={ailment.is_active 
                      ? "text-red-600 hover:text-red-800" 
                      : "text-green-600 hover:text-green-800"
                    }
                  >
                    {ailment.is_active ? <ShieldX className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDeleteDialog(ailment.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {ailments.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No hay registros de dolencias
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedAilmentId(null);
        }}
        onConfirm={handleDeleteAilment}
        title="Eliminar registro de dolencia"
        description="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
      />

      <EditAilmentModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedAilment(null);
        }}
        ailment={selectedAilment}
        playerId={playerId}
      />

      <Dialog open={!!selectedAilmentForView} onOpenChange={() => setSelectedAilmentForView(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles de la dolencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 z-10"
              onClick={() => {
                setSelectedAilment({
                  id: selectedAilmentForView.id,
                  date: selectedAilmentForView.date,
                  description: selectedAilmentForView.description
                });
                setEditModalOpen(true);
                setSelectedAilmentForView(null);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <div>
              <h3 className="font-medium mb-1">Fecha y Hora</h3>
              <p>{selectedAilmentForView && format(new Date(selectedAilmentForView.date), "PPP 'a las' p", { locale: es })}</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Descripción</h3>
              <p className="whitespace-pre-wrap break-words cursor-text">{selectedAilmentForView?.description}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
