/**
 * @fileoverview Definición de tipos para la entidad TipoAdmision
 * @module types/tipoAdmision.types
 */

/**
 * Interfaz que representa un Tipo de Admisión en el sistema
 * @interface TipoAdmision
 */
export interface TipoAdmision {
  /**
   * Identificador único del tipo de admisión (código de 1 carácter)
   */
  valor: string;

  /**
   * Descripción del tipo de admisión
   */
  descripcion: string;
}
