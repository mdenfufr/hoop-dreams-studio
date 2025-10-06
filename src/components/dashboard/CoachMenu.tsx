import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

interface CoachMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  onTransfer: () => void;
}

export function CoachMenu({ onEdit, onDelete, onTransfer }: CoachMenuProps) {
  const { getGradientClasses } = useOrganizationTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={`h-8 w-8 text-primary-foreground bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} transition-all duration-300`}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onTransfer}>
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Asignar a Categoría
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-red-600">
          <Trash className="mr-2 h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}