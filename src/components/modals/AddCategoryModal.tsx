import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
  initialData?: string;
}

export function AddCategoryModal({ isOpen, onClose, onAdd, initialData }: AddCategoryModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (initialData) {
      setName(initialData);
    } else {
      setName("");
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(name);
    setName("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Categoría" : "Añadir Nueva Categoría"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="categoryName" className="text-sm font-medium">
              Nombre de la Categoría
            </label>
            <Input
              id="categoryName"
              placeholder="Ingrese el nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full bg-[#0F172A] hover:bg-[#1E293B]">
            {initialData ? "Guardar Cambios" : "Crear Categoría"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}