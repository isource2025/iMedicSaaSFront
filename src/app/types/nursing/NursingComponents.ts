/**
 * Interfaz para los registros de control frecuente de enfermería
 */
export interface ControlFrecuente {
  FechaControl: string;
  HoraControl: string;
  IdSector: string;
  Pulso: number;
  Maximo: number;
  Minimo: number;
  PAMedia: number;
  FrecuenciaRespiratoria: number;
  Axilar: number;
  Rectal: number;
  Saturometria: number;
  HGT: number;
  Observaciones: string;
  Profesional: string;
}

/**
 * Props para el componente NursingReportModal
 */
export interface NursingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  numeroVisita: number;
  nombrePaciente: string;
}

/**
 * Props para el componente VitalSignsChart
 */
export interface VitalSignsChartProps {
  controls: ControlFrecuente[];
  selectedSignType: VitalSignType;
  onSignTypeChange: (type: VitalSignType) => void;
}

/**
 * Tipos de signos vitales para visualización en gráficos
 */
export type VitalSignType = 
  | 'pulso' 
  | 'tension' 
  | 'temperatura' 
  | 'respiracion' 
  | 'saturacion' 
  | 'glucemia';
