/**
 * Interfaz para representar un diagnóstico CIE10 de la tabla imdiagnosticos
 */
export interface DiagnosticoCie10 {
  idDiagnostico: number;  // Campo Valor de la tabla
  CodigoOMS: string;    // Campo CodigoOMS de la tabla
  descripcion: string;    // Campo Descripcion de la tabla
  sexo?: number;          // Campo Sexo de la tabla (opcional)
  edadMinima?: number;    // Campo EdadMinima de la tabla (opcional)
  edadMaxima?: number;    // Campo EdadMaxima de la tabla (opcional)
  memo?: string;          // Campo Memo de la tabla (opcional)
  cie?: number;           // Campo CIE de la tabla (opcional)
}

/**
 * Interfaz para la respuesta de la API
 */
export interface DiagnosticosResponse {
  success: boolean;
  message: string;
  data: DiagnosticoCie10[];
}
