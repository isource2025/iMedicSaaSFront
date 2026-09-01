import { apiFetch } from '@/app/utils/authFetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';

/** I = alta, U = modificación, D = borrado. */
export type AccionAuditoria = 'I' | 'U' | 'D' | string;

export interface CampoAuditoria {
    columna: string;
    valorAnterior: string | null;
    valorNuevo: string | null;
}

/** Un guardado: la sentencia que agrupa todos los campos que cambiaron. */
export interface MovimientoAuditoria {
    lote: string;
    idHCIngreso: number;
    numeroVisita: number | null;
    accion: AccionAuditoria;
    fechaHora: string;
    /** WEB (pasó por esta app) o DIRECTO (Clarion u otro cliente SQL). */
    origen: string | null;
    usuario: string | null;
    idOperador: number | null;
    loginSql: string | null;
    aplicacion: string | null;
    host: string | null;
    campos: CampoAuditoria[];
}

export interface AuditoriaHci {
    /** false si el tenant todavía no tiene instalado el trigger. */
    instalada: boolean;
    truncado: boolean;
    movimientos: MovimientoAuditoria[];
}

const VACIA: AuditoriaHci = { instalada: false, truncado: false, movimientos: [] };

async function pedir(url: string): Promise<AuditoriaHci> {
    const response = await apiFetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        throw new Error(`Error al obtener el historial de la HC (${response.status})`);
    }

    const result = await response.json();

    if (!result.success) {
        throw new Error(result.message || 'Error al obtener el historial de la HC');
    }

    return { ...VACIA, ...(result.data || {}) };
}

/** Historial de una HC puntual. Requiere INTERNACION.AUDITORIA_HC.VER. */
export async function obtenerAuditoriaPorHC(idHCIngreso: number): Promise<AuditoriaHci> {
    return pedir(`${API_URL}/auditoria-hci/hc/${idHCIngreso}`);
}

/**
 * Historial de todas las HC de la visita. Incluye las borradas, que ya no
 * aparecen en el listado de la sección.
 */
export async function obtenerAuditoriaPorVisita(numeroVisita: number): Promise<AuditoriaHci> {
    return pedir(`${API_URL}/auditoria-hci/visita/${numeroVisita}`);
}
