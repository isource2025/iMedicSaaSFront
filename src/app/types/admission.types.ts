// Interfaces para tablas de admisión
// Clase Paciente
export interface ClasePaciente {
  Valor: string;
  Descripcion: string;
}

// Dador de órganos
export interface DadorOrganos {
  Valor: string;
  Descripcion: string;
}

// Diagnóstico
export interface Diagnostico {
  Valor: string;
  Descripcion: string;
  Agrupamiento?: string;
}

// Disposición de egreso
export interface DisposicionEgreso {
  Valor: string;
  Descripcion: string;
}

// Estado ambulatorio
export interface EstadoAmbulatorio {
  Valor: string;
  Descripcion: string;
}

// Estado civil
export interface EstadoCivil {
  Valor: string;
  Descripcion: string;
}

// Interfaz común para columnas de tabla
export interface ColumnDefinition {
  key: string;
  label: string;
  editable?: boolean;
}
