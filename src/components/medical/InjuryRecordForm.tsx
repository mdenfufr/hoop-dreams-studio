
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
  injury_description: z.string().min(1, "La descripción es requerida"),
  recommended_treatment: z.string().min(1, "El tratamiento recomendado es requerido"),
});

interface InjuryRecordFormProps {
  playerId: string;
  onSubmit?: () => void;
}

export function InjuryRecordForm({ playerId, onSubmit }: InjuryRecordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { getGradientClasses } = useOrganizationTheme();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      injury_description: "",
      recommended_treatment: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('injury_records')
        .insert({
          player_id: playerId,
          date: values.date,
          injury_description: values.injury_description,
          recommended_treatment: values.recommended_treatment,
        });

      if (error) throw error;

      toast({
        title: "Registro guardado",
        description: "El registro de lesión ha sido guardado exitosamente",
      });

      // Invalidate both injury records and injured players count queries
      await queryClient.invalidateQueries({ queryKey: ["injury-records", playerId] });
      await queryClient.invalidateQueries({ queryKey: ["injuredPlayersCount"] });

      form.reset();
      onSubmit?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el registro de lesión",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
          name="injury_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción de la lesión</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe la lesión..."
                  className="min-h-[100px]"
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
                  placeholder="Describe el tratamiento..."
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
