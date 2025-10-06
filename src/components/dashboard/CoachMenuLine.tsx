import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

interface CoachMenuLineProps {
  onEdit: () => void;
  onDelete: () => void;
  onTransfer: () => void;
}

export function CoachMenuLine({ onEdit, onDelete, onTransfer }: CoachMenuLineProps) {
  const { getGradientClasses } = useOrganizationTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={`h-8 w-8 text-primary-foreground bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} transition-all duration-300`}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onTransfer}>
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Transferir
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-red-600">
          <Trash className="mr-2 h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}