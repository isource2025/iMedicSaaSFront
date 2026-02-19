export interface HCIngresoRecord {
    IdHCIngreso: number;
    NumeroVisita: number;
    IdSector: string;
    SectorDescripcion?: string;
    MotivoConsulta: string;
    EnfermedadActual: string;
    IdProfecional: number;
    ProfesionalNombre?: string;
    Fecha?: string;
    FechaFormateada?: string;
    HoraFormateada?: string;
}
