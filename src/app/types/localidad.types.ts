/**
 * Interfaz que define la estructura de una Localidad
 */
export interface Localidad {
  /** Valor identificador de la localidad */
  Valor: number;
  
  /** Código postal de la localidad */
  CodigoPostal: number;
  
  /** Nombre de la localidad */
  NombreLocalidad: string;
  
  /** Valor identificador de la provincia a la que pertenece la localidad */
  ValorProvincia: string;
}
