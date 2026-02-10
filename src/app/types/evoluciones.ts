// Tipos para Evoluciones Médicas (tabla imHCEvolucion)

export interface Evolucion {
    idHCEvolucion?: number;
    idVisita: number;
    nroHC?: string;
    fechaEv: string; // ISO format YYYY-MM-DD
    horaEv: string; // HH:mm:ss
    idSector?: string;
    profesional?: number;
    evolucion: string;
    numeroDocumento?: string;
    // Campos calculados del backend
    profesionalNombre?: string;
    profesionalApellido?: string;
}

export interface NuevaEvolucionPayload {
    IdVisita: number;
    FechaEv: string; // YYYY-MM-DD
    HoraEv: string; // HH:mm:ss
    IdSector: string;
    Evolucion: string;
    NumeroDocumento: string;
    Profecional?: number; // Matrícula del profesional (idPersonal)
}

export interface EvolucionesResponse {
    success: boolean;
    data: Evolucion[];
    mensaje?: string;
}

export interface EvolucionResponse {
    success: boolean;
    data: Evolucion;
    mensaje?: string;
}
