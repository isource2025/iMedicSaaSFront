/**
 * @fileoverview Definición de tipos para la entidad Sexo
 * @module types/sexo.types
 */

/**
 * Interfaz que representa un Sexo en el sistema
 * @interface Sexo
 */
export interface Sexo {
  /**
   * Identificador único del sexo (código de 1 carácter)
   */
  valor: string;

  /**
   * Descripción del sexo
   */
  descripcion: string;
}
