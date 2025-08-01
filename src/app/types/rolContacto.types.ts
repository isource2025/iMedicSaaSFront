/**
 * @fileoverview Definición de tipos para la entidad RolContacto
 * @module types/rolContacto.types
 */

/**
 * Interfaz que representa un Rol de Contacto en el sistema
 * @interface RolContacto
 */
export interface RolContacto {
  /**
   * Identificador único del rol de contacto (código de 3 caracteres)
   */
  Valor: string;

  /**
   * Descripción del rol de contacto
   */
  Descripcion: string;
}
