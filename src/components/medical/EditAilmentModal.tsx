import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

const formSchema = z.object({
  date: z.string().min(1, "La fecha es requerida"),
  time: z.string().min(1, "La hora es requerida"),
  description: z.string().min(1, "La descripción es requerida"),
});

interface EditAilmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  ailment: {
    id: string;
    date: string;
    description: string;
  } | null;
  playerId: string;
}

export function EditAilmentModal({ isOpen, onClose, ailment, playerId }: EditAilmentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { getGradientClasses } = useOrganizationTheme();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: "",
      time: "",
      description: "",
    },
  });

  useEffect(() => {
    if (ailment) {
      const date = new Date(ailment.date);
      form.reset({
        date: date.toISOString().split('T')[0],
        time: date.toTimeString().split(' ')[0].slice(0, 5),
        description: ailment.description,
      });
    }
  }, [ailment, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!ailment) return;
    
    setIsLoading(true);
    try {
      const dateTime = `${values.date}T${values.time}:00`;
      
      const { error } = await supabase
        .from('ailments')
        .update({
          date: dateTime,
          description: values.description,
        })
        .eq('id', ailment.id);

      if (error) {
        console.error("Error updating ailment:", error);
        throw error;
      }

      toast({
        title: "Registro actualizado",
        description: "El registro de dolencia ha sido actualizado exitosamente",
      });

      // Invalidate queries to update both list and counters
      queryClient.invalidateQueries({ queryKey: ["ailments", playerId] });
      queryClient.invalidateQueries({ queryKey: ["ailmentPlayersCount"] });
      onClose();
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el registro de dolencia",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar registro de dolencia</DialogTitle>
          <DialogDescription>
            Modifica los detalles de la dolencia registrada.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción de la dolencia</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe la dolencia..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading} className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border hover:shadow-lg`}>
                <span className="text-primary-foreground">{isLoading ? "Actualizando..." : "Actualizar registro"}</span>
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}