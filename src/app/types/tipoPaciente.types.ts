/**
 * @fileoverview Definición de tipos para la entidad TipoPaciente
 * @module types/tipoPaciente.types
 */

/**
 * Interfaz que representa un Tipo de Paciente en el sistema
 * @interface TipoPaciente
 */
export interface TipoPaciente {
  /**
   * Identificador único del tipo de paciente (código de 1 carácter)
   */
  valor: string;

  /**
   * Descripción del tipo de paciente
   */
  descripcion: string;
}
