/**
 * @fileoverview Definición de tipos para la entidad Requisito
 * @module types/requisito.types
 */

/**
 * Interfaz que representa un Requisito de Cliente en el sistema
 * @interface Requisito
 */
export interface Requisito {
  /**
   * Identificador único del requisito
   */
  Valor: number;

  /**
   * Descripción del requisito
   */
  Descripcion: string;

  /**
   * Indica si el requisito es aplicable al paciente
   */
  AplicableAlPaciente: string;
}
