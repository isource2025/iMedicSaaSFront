/**
 * @interface Provincia
 * @description Interfaz que representa la estructura de una provincia en el sistema.
 */
export interface Provincia {
  /** Identificador numérico de la provincia */
  Valor: number;
  
  /** Código de 3 letras para la provincia */
  LetraProvincia: string;
  
  /** Nombre completo de la provincia */
  Descripcion: string;
  
  /** Código de la nacionalidad a la que pertenece la provincia */
  ValorNacionalidad: string;
}
