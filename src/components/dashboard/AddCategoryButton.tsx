import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

interface AddCategoryButtonProps {
  onClick: () => void;
}

export function AddCategoryButton({ onClick }: AddCategoryButtonProps) {
  const { getGradientClasses, getOverlayColor, getTextColor } = useOrganizationTheme();
  return (
    <Button
      onClick={onClick}
      variant="outline"
      className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border-2 border-border rounded-xl p-2.5 transition-all duration-300 shadow-2xl transform hover:scale-105 gap-2`}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
      <div className={`absolute inset-0 ${getOverlayColor()} rounded-xl backdrop-blur-sm`}></div>
      <div className="relative flex items-center justify-center gap-2">
        <Plus className={`w-4 h-4 ${getTextColor()}`} />
        <span className={`text-sm font-rajdhani font-semibold uppercase tracking-wider ${getTextColor()}`}>
          Añadir Categoría
        </span>
      </div>
    </Button>
  );
}