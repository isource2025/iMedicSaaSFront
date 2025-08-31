export interface IndicadorData {
  Fecha: string;
  ClasePaciente: string;
  TotalIngresos: number;
}

export interface ResumenIndicadores {
  resumenPorClase: Record<string, number>;
  totalGeneral: number;
  periodo: {
    fechaInicio: string;
    fechaFin: string;
  };
}

export interface IndicadorPorFecha {
  fecha: string;
  total: number;
  porClase: Record<string, number>;
}

export interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
    borderColor: string[];
    borderWidth: number;
  }[];
}

export interface BarChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
  }[];
}
