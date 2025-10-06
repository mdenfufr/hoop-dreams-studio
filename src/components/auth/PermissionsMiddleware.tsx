
import { ReactNode, useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePermissions } from "@/hooks/use-permissions";
import { useToast } from "@/hooks/use-toast";

interface PermissionsMiddlewareProps {
  children: ReactNode;
  requiredSection?: string;
  requiresEdit?: boolean;
}

export function PermissionsMiddleware({
  children,
  requiredSection,
  requiresEdit = false,
}: PermissionsMiddlewareProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { permissions, isLoading, canView, canEdit, getFirstAccessibleSection } = usePermissions();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const deniedKeyRef = useRef<string | null>(null);
  const lastRedirectRef = useRef<string | null>(null);
  useEffect(() => {
    // Si no se requiere una sección específica, permitir acceso
    if (!requiredSection) {
      setHasAccess(true);
      return;
    }
    
    // Esperar a que los permisos se carguen
    if (isLoading) {
      return;
    }

    // Verificar el nivel de acceso del usuario a la sección requerida
    console.log(`Verificando acceso a sección "${requiredSection}":`, {
      accessLevel: permissions[requiredSection],
      requiresEdit,
    });
    
    let userHasAccess = false;

    if (requiresEdit) {
      // Si se requiere permiso de edición, verificar que sea editor
      userHasAccess = canEdit(requiredSection);
    } else {
      // Si solo se requiere visualización, verificar que sea editor o visualizador
      userHasAccess = canView(requiredSection);
    }

    setHasAccess(userHasAccess);

    // Si no tiene acceso, mostrar mensaje y redirigir (una sola vez por ruta)
    if (!userHasAccess) {
      const key = `${requiredSection ?? 'none'}:${location.pathname}:${requiresEdit ? 'edit' : 'view'}`;

      if (deniedKeyRef.current !== key) {
        let message = "No tienes permisos para acceder a esta sección.";
        if (requiresEdit && requiredSection && canView(requiredSection)) {
          message = "Solo tienes permisos de visualización para esta sección. No puedes realizar cambios.";
        }
        toast({
          variant: "destructive",
          title: "Acceso denegado",
          description: message,
        });
        deniedKeyRef.current = key;
      }

      const accessibleSection = getFirstAccessibleSection();

      // Redirigir solo si realmente cambia la ruta
      if (accessibleSection && accessibleSection !== location.pathname && lastRedirectRef.current !== accessibleSection) {
        console.log("Redirigiendo a sección accesible:", accessibleSection);
        lastRedirectRef.current = accessibleSection;
        navigate(accessibleSection, { replace: true });
      } else if ((!accessibleSection || accessibleSection === location.pathname) && location.pathname !== "/dashboard" && lastRedirectRef.current !== "/dashboard") {
        lastRedirectRef.current = "/dashboard";
        navigate("/dashboard", { replace: true });
      }

      return;
    }
  }, [requiredSection, requiresEdit, permissions, isLoading, canView, canEdit, navigate, toast, location.pathname, getFirstAccessibleSection]);

  // Mientras se verifica el acceso, mostrar un indicador de carga
  if (isLoading || hasAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 rounded mb-3"></div>
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Si no tiene acceso, no renderizar nada (la redirección ya se habrá activado)
  if (!hasAccess) {
    return null;
  }

  // Si tiene acceso, mostrar los hijos
  return <>{children}</>;
}
