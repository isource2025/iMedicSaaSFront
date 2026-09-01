import type { DatosFiliatoriosPaciente } from './pacienteDatos';

export interface HCIngresoRecord extends DatosFiliatoriosPaciente {
    IdHCIngreso: number;
    NumeroVisita: number;
    IdSector: string;
    SectorDescripcion?: string;
    MotivoConsulta: string;
    EnfermedadActual: string;
    IdProfecional: number;
    ProfesionalNombre?: string;
    IdPersonal?: number | null;
    Matricula?: number | string | null;
    Fecha?: string;
    FechaFormateada?: string;
    HoraFormateada?: string;
}
