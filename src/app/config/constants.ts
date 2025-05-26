// Constantes de configuración para la aplicación

// URL base de la API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Colores de la paleta Pantone para iMedicWs
export const COLORS = {
  PRIMARY: '#00B5E2',    // Pantone 313U - Azul turquesa brillante
  SECONDARY: '#61D6EB',  // Pantone 311U - Azul celeste claro
  DARK: '#0083A9',       // Pantone 314C - Azul turquesa oscuro
  LIGHT: '#41C8DC',      // Pantone 311C - Azul celeste medio
};

// Configuración de paginación
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 30,
  ITEMS_PER_PAGE_OPTIONS: [10, 20, 30, 50, 100],
};

// Timeouts para operaciones
export const TIMEOUTS = {
  DEBOUNCE_SEARCH: 300, // ms
  API_REQUEST: 30000,   // ms
};
