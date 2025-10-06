import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Import all organization themes
import theme_8279b068 from '@/themes/8279b068-12b0-4130-8ab6-dd85461ead94';
import theme_8d2a0bcf from '@/themes/8d2a0bcf-e16b-491b-be8b-762359b17701';
import theme_2f273bd1 from '@/themes/2f273bd1-a748-44c9-840b-831d3d689c11';
import theme_56a8905d from '@/themes/56a8905d-1214-4379-85d1-012b8b1fa8eb';
import theme_bce07d48 from '@/themes/bce07d48-6784-4f6b-8f9d-6afa6b94ba55';
import theme_0301780d from '@/themes/0301780d-3ce7-44a8-ac83-42e29da02aff';
import theme_a495d0da from '@/themes/a495d0da-6159-438c-85ed-6c63d12c8c98';
import theme_d65183e2 from '@/themes/d65183e2-4b42-4c9b-9e40-da5f152deae2';
import theme_7be6c911 from '@/themes/7be6c911-2a63-4d07-a9a0-867e10d8109a';
import theme_c63c6669 from '@/themes/c63c6669-d96e-4997-afc8-23a3bcda0c96';
import theme_b5f25f86 from '@/themes/b5f25f86-ec71-4b5c-bb47-63e872887f22';
import theme_933f787d from '@/themes/933f787d-6038-43ae-921a-f8457aac6593';
import theme_717ac06b from '@/themes/717ac06b-538d-468a-9f4b-841f6126f92a';
import theme_81eadc21 from '@/themes/81eadc21-cb9f-4885-a508-6a49d29619a4';

// Theme mapping
const themes: Record<string, any> = {
  '8279b068-12b0-4130-8ab6-dd85461ead94': theme_8279b068,
  '8d2a0bcf-e16b-491b-be8b-762359b17701': theme_8d2a0bcf,
  '2f273bd1-a748-44c9-840b-831d3d689c11': theme_2f273bd1,
  '56a8905d-1214-4379-85d1-012b8b1fa8eb': theme_56a8905d,
  'bce07d48-6784-4f6b-8f9d-6afa6b94ba55': theme_bce07d48,
  '0301780d-3ce7-44a8-ac83-42e29da02aff': theme_0301780d,
  'a495d0da-6159-438c-85ed-6c63d12c8c98': theme_a495d0da,
  'd65183e2-4b42-4c9b-9e40-da5f152deae2': theme_d65183e2,
  '7be6c911-2a63-4d07-a9a0-867e10d8109a': theme_7be6c911,
  'c63c6669-d96e-4997-afc8-23a3bcda0c96': theme_c63c6669,
  'b5f25f86-ec71-4b5c-bb47-63e872887f22': theme_b5f25f86,
  '933f787d-6038-43ae-921a-f8457aac6593': theme_933f787d,
  '717ac06b-538d-468a-9f4b-841f6126f92a': theme_717ac06b,
  '81eadc21-cb9f-4885-a508-6a49d29619a4': theme_81eadc21,
};

interface ThemeContextType {
  theme: any;
  organizationId: string | null;
  isCalera: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: theme_c63c6669, // Default theme
  organizationId: null,
  isCalera: false,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [theme, setTheme] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganization = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const applyThemeToCssVars = (selected: any) => {
        const root = document.documentElement;
        Object.entries(selected?.colors || {}).forEach(([key, value]) => {
          // Support both camelCase (mutedForeground) and kebab-case (muted-foreground)
          const kebab = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
          root.style.setProperty(`--${kebab}`, value as string);
          root.style.setProperty(`--${key}`, value as string);
        });
      };

      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (userData?.organization_id) {
          setOrganizationId(userData.organization_id);
          const selectedTheme = themes[userData.organization_id] || theme_c63c6669;
          setTheme(selectedTheme);
          applyThemeToCssVars(selectedTheme);
          console.debug('[Theme] Applied org theme from table', userData.organization_id, selectedTheme?.name);
        } else {
          // Fallback: try auth.user_metadata
          const meta: any = (user as any).user_metadata || {};
          if (meta.organization_id) {
            setOrganizationId(meta.organization_id);
            const selectedTheme = themes[meta.organization_id] || theme_c63c6669;
            setTheme(selectedTheme);
            applyThemeToCssVars(selectedTheme);
            console.debug('[Theme] Applied org theme from user_metadata', meta.organization_id, selectedTheme?.name);
          } else {
            // Final fallback to default
            setOrganizationId(null);
            setTheme(theme_c63c6669);
            applyThemeToCssVars(theme_c63c6669);
            console.debug('[Theme] Applied default theme (no organization)');
          }
        }
      } else {
        // Not logged in: keep default tokens
        setOrganizationId(null);
        setTheme(theme_c63c6669);
        applyThemeToCssVars(theme_c63c6669);
      }
      setLoading(false);
    };

    fetchOrganization();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchOrganization();
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const isCalera = organizationId === '933f787d-6038-43ae-921a-f8457aac6593';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme: theme || theme_c63c6669, organizationId, isCalera }}>
      {children}
    </ThemeContext.Provider>
  );
};