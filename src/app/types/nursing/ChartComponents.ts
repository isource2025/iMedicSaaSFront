/**
 * Tipos para los componentes de gráficos de enfermería
 */

/**
 * Representa un registro de control frecuente de un paciente
 */
export interface ControlFrecuente {
  FechaControl: string;
  HoraControl: string;
  Pulso?: number;
  Maximo?: number;
  Minimo?: number;
  PAMedia?: number;
  FrecuenciaRespiratoria?: number;
  Axilar?: number;
  Rectal?: number;
  Saturometria?: number;
  HGT?: number;
  Observaciones?: string;
  Profesional?: string;
}

/**
 * Props para el componente ControlesFrecuentesChart
 */
export interface ControlesFrecuentesChartProps {
  data: ControlFrecuente[];
  parametro: string;
}

/**
 * Datos formateados para el gráfico
 */
export interface ChartDataPoint {
  fechaHora: string;
  valor: number | null;
}

/**
 * Parámetros disponibles para visualizar en el gráfico
 */
export type ParametroControl = 
  | 'pulso'
  | 'maximo'
  | 'minimo'
  | 'pam'
  | 'frecResp'
  | 'axilar'
  | 'saturometria';
