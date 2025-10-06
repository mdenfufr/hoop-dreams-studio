// Configuración de logos por organización
// Para agregar un nuevo logo, simplemente añade el ID de la organización y la ruta de la imagen

export const organizationLogos: Record<string, string> = {
  // O'Higgins FC
  'c63c6669-d96e-4997-afc8-23a3bcda0c96': '/lovable-uploads/36281024-3c0d-4d53-bc3d-415fce000b14.png',
  
  // Colo-Colo
  '8d2a0bcf-e16b-491b-be8b-762359b17701': '/lovable-uploads/colo-colo-logo.png',
  
  // Unión La Calera
  '933f787d-6038-43ae-921a-f8457aac6593': '/lovable-uploads/union-la-calera-logo.png',
  
  // Huachipato
  // Agrega aquí el logo cuando lo necesites
  // 'otro-id': '/lovable-uploads/huachipato-logo.png',
};

// Logo por defecto si no se encuentra la organización
export const defaultLogo = '/placeholder.svg';

// Función helper para obtener el logo de una organización
export const getOrganizationLogo = (organizationId: string | null): string => {
  if (!organizationId) return defaultLogo;
  return organizationLogos[organizationId] || defaultLogo;
};