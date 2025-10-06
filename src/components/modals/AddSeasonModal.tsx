import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

interface AddSeasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (seasonData: { name: string }) => void;
  initialData?: { id: string; name: string };
}

export function AddSeasonModal({ isOpen, onClose, onAdd, initialData }: AddSeasonModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
    } else {
      setName("");
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ name });
    setName("");
    onClose();
  };

  const { getGradientClasses } = useOrganizationTheme();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Temporada" : "Añadir Temporada"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Nombre de la Temporada
            </label>
            <Input
              id="name"
              placeholder="Ej: Temporada 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button type="submit" className={`w-full bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} text-primary-foreground border border-border hover:shadow-lg`}>
            {initialData ? "Guardar Cambios" : "Añadir Temporada"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}