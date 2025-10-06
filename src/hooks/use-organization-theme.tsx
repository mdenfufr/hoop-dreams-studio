import { useTheme } from '@/contexts/ThemeContext';

export const useOrganizationTheme = () => {
  const { theme, organizationId, isCalera } = useTheme();
  
  // Helper function to get gradient classes using the active org theme
  const getGradientClasses = (type: 'primary' | 'hover' = 'primary') => {
    const gradients = theme?.gradients || {};
    if (type === 'hover') {
      return gradients.hover || 'hover:from-[hsl(var(--primary))] hover:to-[hsl(var(--primary))]';
    }
    return gradients.primary || 'from-[hsl(var(--primary))] to-[hsl(var(--primary))]';
  };

  // Helper function to get button styles (no hardcoded club colors)
  const getButtonStyles = () => {
    return `bg-gradient-to-br ${getGradientClasses('primary')} ${getGradientClasses('hover')} border border-border hover:shadow-lg`;
  };

  // Helper function to get text colors based on design tokens
  const getTextColor = () => {
    return 'text-primary-foreground';
  };

  // Helper function to get background overlay using primary color
  const getOverlayColor = () => {
    return 'bg-primary/10';
  };
  return {
    theme,
    organizationId,
    isCalera,
    getGradientClasses,
    getButtonStyles,
    getTextColor,
    getOverlayColor,
  };
};