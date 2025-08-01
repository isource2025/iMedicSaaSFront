/**
 * @fileoverview Definición de tipos para la entidad Religion
 * @module types/religion.types
 */

/**
 * Interfaz que representa una Religión en el sistema
 * @interface Religion
 */
export interface Religion {
  /**
   * Código único de la religión (3 caracteres)
   */
  Valor: string;

  /**
   * Descripción o nombre de la religión
   */
  Descripcion: string;
}
