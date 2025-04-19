export type BedEstado = 
  | 'acompañante' 
  | 'aislada' 
  | 'cerrada' 
  | 'desocupada' 
  | 'ocupada' 
  | 'Que haceres domésticos' 
  | 'reparacion'
  | 'disponible'
  | 'mantenimiento';

export interface Bed {
  id: string;
  sector: string;
  numeroCama: string;
  estado: BedEstado;
  valorEstadoOriginal: string; // Valor original del estado (A, I, C, U, O, H, R)
  estadoDescripcion: string; // Descripción completa del estado de la cama
  fechaIngreso: number;
  fechaEgreso: number;
  numeroVisita: number;
  mostrarNumeroVisita: string;
  observaciones: string;
  nombrePaciente: string;
  documentoPaciente: string;
  diagnosticoDescripcion: string;
  razonSocialCliente: string; // Razón social del cliente (obra social)
  sexoPaciente: string; // Sexo del paciente (F: femenino, M: masculino, otro)
  descripcionSexo: string; // Descripción completa del sexo desde la tabla imSexo
  servicioMedicoDescripcion: string; // Descripción del servicio médico desde imServiciosMedicos
}

export interface BedState {
  id: string;
  valor: string;
  descripcion: string;
}
