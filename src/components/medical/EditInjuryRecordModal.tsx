import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";

const injuryRecordFormSchema = z.object({
  date: z.string().min(1, "La fecha es requerida"),
  time: z.string().min(1, "La hora es requerida"),
  injury_description: z.string().min(1, "La descripción de la lesión es requerida"),
  recommended_treatment: z.string().min(1, "El tratamiento recomendado es requerido"),
});

type FormValues = z.infer<typeof injuryRecordFormSchema>;

interface InjuryRecord {
  id: string;
  date: string;
  injury_description: string;
  recommended_treatment: string;
  is_active: boolean;
}

interface EditInjuryRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  injuryRecord: InjuryRecord | null;
  playerId: string;
}

export function EditInjuryRecordModal({ 
  isOpen, 
  onClose, 
  injuryRecord, 
  playerId 
}: EditInjuryRecordModalProps) {
  const queryClient = useQueryClient();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(injuryRecordFormSchema),
    defaultValues: {
      date: "",
      time: "",
      injury_description: "",
      recommended_treatment: "",
    },
  });

  useEffect(() => {
    if (injuryRecord && isOpen) {
      const recordDate = new Date(injuryRecord.date);
      const dateStr = recordDate.toISOString().split('T')[0];
      const timeStr = recordDate.toTimeString().slice(0, 5);
      
      form.reset({
        date: dateStr,
        time: timeStr,
        injury_description: injuryRecord.injury_description,
        recommended_treatment: injuryRecord.recommended_treatment,
      });
    }
  }, [injuryRecord, isOpen, form]);

  const handleSubmit = async (values: FormValues) => {
    if (!injuryRecord) return;

    try {
      const dateTime = new Date(`${values.date}T${values.time}`);
      
      const { error } = await supabase
        .from("injury_records")
        .update({
          date: dateTime.toISOString(),
          injury_description: values.injury_description,
          recommended_treatment: values.recommended_treatment,
        })
        .eq("id", injuryRecord.id);

      if (error) throw error;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["injury-records", playerId] });
      queryClient.invalidateQueries({ queryKey: ["injuredPlayersCount"] });
      
      toast({
        title: "Registro actualizado",
        description: "El registro de lesión ha sido actualizado exitosamente",
      });
      
      onClose();
    } catch (error) {
      console.error("Error updating injury record:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el registro de lesión",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar registro de lesión</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
              name="injury_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción de la lesión</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe la lesión..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recommended_treatment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tratamiento recomendado</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe el tratamiento recomendado..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                Guardar cambios
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}