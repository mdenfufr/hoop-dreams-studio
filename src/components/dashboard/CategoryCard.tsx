
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, CalendarPlus, MoreVertical, Edit, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/modals/DeleteConfirmationDialog";
import { usePermissions } from "@/hooks/use-permissions";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

interface CategoryCardProps {
  name: string;
  onAddPlayer: () => void;
  onAddMatch: () => void;
  onShowPlayers: () => void;
  onEdit?: (categoryId: string) => void;
  onDelete?: (categoryId: string) => void;
  id: string;
  hideActions?: boolean;
}

export function CategoryCard({ 
  name, 
  onAddPlayer, 
  onAddMatch, 
  onShowPlayers,
  onEdit,
  onDelete,
  id,
  hideActions = false
}: CategoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const { canEdit } = usePermissions();
  const canModify = canEdit("football");
  const { getGradientClasses, getOverlayColor, getTextColor } = useOrganizationTheme();

  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = () => {
    onDelete && onDelete(id);
    setShowDeleteConfirmation(false);
  };

  return (
    <div className="w-full space-y-2">
      <div className="relative">
        <button
          onClick={() => {
            setIsExpanded(!isExpanded);
            onShowPlayers();
          }}
          className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl p-4 transition-all duration-300 shadow-2xl w-full h-32 transform hover:scale-105`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
          <div className={`absolute inset-0 ${getOverlayColor()} rounded-xl backdrop-blur-sm`}></div>
          <div className="relative flex flex-col items-center justify-center h-full text-center">
            <div className="space-y-1">
              <p className={`text-lg font-rajdhani font-semibold ${getTextColor()} uppercase tracking-wider`}>{name}</p>
            </div>
          </div>
          <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
        </button>
        
        {!hideActions && canModify && (
          <div className="absolute right-2 top-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 text-primary-foreground bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} transition-all duration-300`}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit && onEdit(id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-red-600"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      
      {isExpanded && !hideActions && (
        <div className="flex gap-2 mt-2">
          {canModify && (
            <>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddPlayer();
                }}
                className={`flex-1 gap-2 bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} text-white`}
              >
                <UserPlus className="w-4 h-4" />
                Añadir Jugador
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddMatch();
                }}
                className={`flex-1 gap-2 bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} text-white`}
              >
                <CalendarPlus className="w-4 h-4" />
                Crear Partido
              </Button>
            </>
          )}
        </div>
      )}

      <DeleteConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Categoría"
        description={`¿Estás seguro que deseas eliminar la categoría "${name}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
