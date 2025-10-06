// Club Deportivo ColoColo Theme
export default {
  name: 'Colo-Colo',
  colors: {
    primary: '0 0% 20%',        // Gris oscuro (#333), base principal
    secondary: '0 0% 95%',      // Gris muy claro (#f2f2f2), contraste con negro
    accent: '0 0% 40%',         // Gris medio (#666), para detalles
    background: '0 0% 98%',     // Blanco (#fafafa), como color de fondo principal
    foreground: '0 0% 10%',     // Casi negro (#1a1a1a), para textos en fondos claros
    muted: '0 0% 90%',          // Gris claro para secciones suaves
    mutedForeground: '0 0% 40%',// Texto secundario en gris
    card: '0 0% 100%',          // Blanco, para tarjetas
    destructive: '0 84% 60.2%', // Rojo de alerta
    border: '0 0% 85%',         // Bordes grises suaves
    input: '0 0% 85%',          // Inputs con borde gris
    ring: '0 0% 20%',           // Resalta en gris oscuro
  },
  gradients: {
    primary: 'from-[#1a1a1a] via-[#2d2d2d] to-[#444444]', // degradado negro-gris
    hover: 'hover:from-[#2d2d2d] hover:to-[#1a1a1a]',     // hover con contraste
  }
}