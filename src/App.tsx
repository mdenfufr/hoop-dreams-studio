
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import YouthFootball from "./pages/YouthFootball";
import Medical from "./pages/Medical";
import MedicalStaff from "./pages/MedicalStaff";
import Physical from "./pages/Physical";
import YouthPlayers from "./pages/YouthPlayers";
import PhysicalLoadControl from "./pages/physical/PhysicalLoadControl";
import PhysicalEvaluations from "./pages/physical/PhysicalEvaluations";
import ForceEvaluation from "./pages/physical/ForceEvaluation";
import SpeedEvaluation from "./pages/physical/SpeedEvaluation";
import ResistanceEvaluation from "./pages/physical/ResistanceEvaluation";
import AnthropometryEvaluation from "./pages/physical/AnthropometryEvaluation";
import AddStaff from "./pages/AddStaff";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PermissionsMiddleware } from "@/components/auth/PermissionsMiddleware";
import { usePermissions } from "@/hooks/use-permissions";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Este componente maneja la redirección inteligente basada en permisos
const SmartRedirect = () => {
  const { getFirstAccessibleSection, isLoading } = usePermissions();
  const [redirect, setRedirect] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      const accessibleSection = getFirstAccessibleSection();
      if (accessibleSection) {
        setRedirect(accessibleSection);
      } else {
        // Si no tiene acceso a ninguna sección, lo enviamos al dashboard 
        // donde la PermissionsMiddleware lo redirigirá adecuadamente
        setRedirect("/dashboard");
      }
    }
  }, [isLoading, getFirstAccessibleSection]);

  if (isLoading) {
    return <div>Cargando permisos...</div>;
  }

  return redirect ? <Navigate to={redirect} replace /> : <div>No tienes acceso a ninguna sección</div>;
};

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  session ? (
                    <SmartRedirect />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/login"
                element={
                  session ? <SmartRedirect /> : <Login />
                }
              />
              <Route
                path="/dashboard/*"
                element={
                  session ? (
                    <Routes>
                      <Route index element={<PermissionsMiddleware requiredSection="senior_football"><Dashboard /></PermissionsMiddleware>} />
                      <Route path="youth-football" element={<PermissionsMiddleware requiredSection="football"><YouthFootball /></PermissionsMiddleware>} />
                      <Route path="medical" element={<PermissionsMiddleware requiredSection="medical_players"><Medical /></PermissionsMiddleware>} />
                      <Route path="medical-staff" element={<PermissionsMiddleware requiredSection="medical_staff"><MedicalStaff /></PermissionsMiddleware>} />
                      <Route path="physical" element={<PermissionsMiddleware requiredSection="physical"><Physical /></PermissionsMiddleware>} />
                      <Route path="physical/load-control/*" element={<PermissionsMiddleware requiredSection="physical"><PhysicalLoadControl /></PermissionsMiddleware>} />
                      <Route path="physical/evaluations/*" element={<PermissionsMiddleware requiredSection="physical"><PhysicalEvaluations /></PermissionsMiddleware>} />
                      <Route path="physical/evaluations/force/*" element={<PermissionsMiddleware requiredSection="physical"><ForceEvaluation /></PermissionsMiddleware>} />
                      <Route path="physical/evaluations/speed/*" element={<PermissionsMiddleware requiredSection="physical"><SpeedEvaluation /></PermissionsMiddleware>} />
                      <Route path="physical/evaluations/resistance/*" element={<PermissionsMiddleware requiredSection="physical"><ResistanceEvaluation /></PermissionsMiddleware>} />
                      <Route path="physical/evaluations/anthropometry/*" element={<PermissionsMiddleware requiredSection="physical"><AnthropometryEvaluation /></PermissionsMiddleware>} />
                      <Route path="youth-players" element={<PermissionsMiddleware requiredSection="youth_records"><YouthPlayers /></PermissionsMiddleware>} />
                      <Route path="add-staff" element={<PermissionsMiddleware requiredSection="staff"><AddStaff /></PermissionsMiddleware>} />
                    </Routes>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
