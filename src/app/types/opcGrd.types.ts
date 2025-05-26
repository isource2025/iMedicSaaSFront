/**
 * Interfaz para las opciones de grilla
 */
export interface OpcGrd {
  id?: number; // Opcional porque no siempre viene del backend
  rubro: string;
  descripcion: string;
  icono: string;
  orden: number;
}

/**
 * Interfaz para agrupar opciones de grilla por rubro
 */
export interface OpcGrdGroup {
  rubro: string;
  opciones: OpcGrd[];
}

/**
 * Interfaz para crear una nueva opción de grilla
 */
export interface CreateOpcGrdDto {
  descripcion: string;
}

/**
 * Interfaz para actualizar una opción de grilla
 */
export interface UpdateOpcGrdDto {
  descripcion: string;
}
