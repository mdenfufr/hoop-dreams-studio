
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CoachCategoryAssignment {
  category_id: string;
  role: string;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [coachAssignments, setCoachAssignments] = useState<CoachCategoryAssignment[]>([]);
  const { toast } = useToast();

  const fetchPermissions = async () => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setPermissions({});
        setIsLoading(false);
        return;
      }
      
      setUserId(user.id);
      
      // Normalizador de permisos para valores inconsistentes
      const normalizeAccess = (value: string | null) => {
        if (!value || value === 'sin_acceso' || value === 'no_access') return 'sin_acceso';
        if (value === 'editor') return 'editor';
        if (value === 'visualizador') return 'visualizador';
        return 'sin_acceso';
      };
      
      // Obtener permisos del usuario desde la tabla users
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error("Error al obtener permisos:", error);
        // Fallback: usar user_metadata cuando la fila en public.users no existe (406)
        const meta: any = (user as any).user_metadata || {};
        setOrganizationId(meta.organization_id ?? null);
        setPermissions({
          senior_football: normalizeAccess(meta.senior_football_access ?? 'sin_acceso'),
          football: normalizeAccess(meta.football_access ?? 'sin_acceso'),
          medical_players: normalizeAccess(meta.medical_players_access ?? 'sin_acceso'),
          medical_staff: normalizeAccess(meta.medical_staff_access ?? 'sin_acceso'),
          physical: normalizeAccess(meta.physical_access ?? 'sin_acceso'),
          youth_records: normalizeAccess(meta.youth_records_access ?? 'sin_acceso'),
          staff: normalizeAccess(meta.staff_access ?? 'sin_acceso'),
        });
      } else if (data) {
        // Set organization ID for multitenancy
        setOrganizationId((data as any).organization_id);
        setPermissions({
          senior_football: normalizeAccess((data as any).senior_football_access),
          football: normalizeAccess((data as any).football_access),
          medical_players: normalizeAccess((data as any).medical_players_access),
          medical_staff: normalizeAccess((data as any).medical_staff_access),
          physical: normalizeAccess((data as any).physical_access),
          youth_records: normalizeAccess((data as any).youth_records_access),
          staff: normalizeAccess((data as any).staff_access)
        });
      }

      // Check if user is a coach and get category-specific permissions
      const { data: coachData } = await supabase
        .from('coaches')
        .select(`
          id,
          coach_category_assignments (
            category_id,
            role
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (coachData && coachData.coach_category_assignments) {
        setCoachAssignments(coachData.coach_category_assignments);
      }
    } catch (error) {
      console.error("Error in fetchPermissions:", error);
      setPermissions({});
    } finally {
      setIsLoading(false);
    }
  };

  const reloadPermissions = () => {
    fetchPermissions();
    toast({
      title: "Usuario actualizado",
      description: "Se ha actualizado tu información de usuario."
    });
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  // Función para verificar si el usuario puede ver la sección
  const canView = (section: string, categoryId?: string) => {
    if (!section || !permissions) return false;
    
    // If it's football section and user is a coach, check category-specific permissions
    if (section === 'football' && categoryId && coachAssignments.length > 0) {
      const assignment = coachAssignments.find(a => a.category_id === categoryId);
      return assignment ? (assignment.role === 'editor' || assignment.role === 'visualizador') : true; // Default to visualizador for other categories
    }
    
    const accessLevel = permissions[section];
    return accessLevel === 'editor' || accessLevel === 'visualizador';
  };

  // Función para verificar si el usuario puede editar la sección
  const canEdit = (section: string, categoryId?: string) => {
    if (!section || !permissions) return false;
    
    // If it's football section and user is a coach, check category-specific permissions
    if (section === 'football' && categoryId && coachAssignments.length > 0) {
      const assignment = coachAssignments.find(a => a.category_id === categoryId);
      return assignment ? assignment.role === 'editor' : false; // Only editor role in assigned category
    }
    
    const accessLevel = permissions[section];
    return accessLevel === 'editor';
  };

  // Función para encontrar la primera sección accesible para el usuario
  // Prioriza secciones donde tiene permisos de edición
  const getFirstAccessibleSection = useCallback((): string | null => {
    if (isLoading || !permissions) return null;

    // Primero buscamos una sección donde el usuario sea editor
    const sectionMapping: Record<string, string> = {
      senior_football: '/dashboard',
      football: '/dashboard/youth-football',
      medical_players: '/dashboard/medical',
      medical_staff: '/dashboard/medical-staff',
      physical: '/dashboard/physical',
      youth_records: '/dashboard/youth-players',
      staff: '/dashboard/add-staff',
    };

    // Primero intentamos encontrar una sección donde el usuario sea editor
    for (const [section, path] of Object.entries(sectionMapping)) {
      if (permissions[section] === 'editor') {
        return path;
      }
    }

    // Si no hay ninguna sección donde sea editor, buscamos una donde sea visualizador
    for (const [section, path] of Object.entries(sectionMapping)) {
      if (permissions[section] === 'visualizador') {
        return path;
      }
    }

    return null;
  }, [isLoading, permissions]);

  return { 
    permissions, 
    isLoading, 
    userId, 
    organizationId,
    reloadPermissions, 
    canView, 
    canEdit,
    getFirstAccessibleSection,
    coachAssignments
  };
}
