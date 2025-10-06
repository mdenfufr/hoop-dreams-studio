
import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useOrganizationTheme } from "@/hooks/use-organization-theme";

const formSchema = z.object({
  date: z.string().min(1, "La fecha es requerida"),
  time: z.string().min(1, "La hora es requerida"),
  description: z.string().min(1, "La descripción es requerida"),
});

interface AilmentFormProps {
  playerId: string;
  onSubmit?: () => void;
  skipPlayerIdValidation?: boolean;
}

export function AilmentForm({ playerId, onSubmit, skipPlayerIdValidation = false }: AilmentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { getGradientClasses } = useOrganizationTheme();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].slice(0, 5),
      description: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      // Construir la fecha y hora correctamente con timezone offset
      const localDate = new Date(`${values.date}T${values.time}:00`);
      const dateTime = localDate.toISOString();
      
      // Create record object with required fields
      const record: any = {
        date: dateTime,
        description: values.description,
      };

      // Only add player_id if we're not skipping validation and there's a valid playerId
      if (!skipPlayerIdValidation && playerId) {
        record.player_id = playerId;
      }

      console.log("Inserting ailment record:", record);
      
      const { error } = await supabase
        .from('ailments')
        .insert(record);

      if (error) {
        console.error("Error saving ailment:", error);
        throw error;
      }

      toast({
        title: "Registro guardado",
        description: "El registro de dolencia ha sido guardado exitosamente",
      });

      // Invalidate queries to refresh both the list and counters
      await queryClient.invalidateQueries({ queryKey: ["ailments"] });
      await queryClient.invalidateQueries({ queryKey: ["ailmentPlayersCount"] });

      form.reset();
      onSubmit?.();
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el registro de dolencia",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
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

        <Button type="submit" disabled={isLoading} className={`relative bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border hover:shadow-lg`}>
          <span className="text-primary-foreground">{isLoading ? "Guardando..." : "Guardar registro"}</span>
        </Button>
      </form>
    </Form>
  );
}
