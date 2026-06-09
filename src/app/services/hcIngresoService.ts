import { HCIngresoRecord } from '@/app/types/hcIngreso';
import { apiFetch } from '@/app/utils/authFetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';

function parseApiError(result: Record<string, unknown>, fallback: string): string {
    const msg = result.error ?? result.message ?? result.mensaje;
    return typeof msg === 'string' && msg.trim() ? msg : fallback;
}

/**
 * Obtener HC de Ingreso por número de visita
 */
export async function obtenerHCIngresoPorVisita(numeroVisita: number): Promise<HCIngresoRecord[]> {
    try {
        const response = await apiFetch(`${API_URL}/hc-ingreso/visita/${numeroVisita}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Error al obtener HC de Ingreso: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Error al obtener HC de Ingreso');
        }

        return result.data || [];
    } catch (error) {
        console.error('Error en obtenerHCIngresoPorVisita:', error);
        throw error;
    }
}

/**
 * Obtener HC de Ingreso por ID
 */
export async function obtenerHCIngresoPorId(id: number): Promise<HCIngresoRecord | null> {
    try {
        const response = await apiFetch(`${API_URL}/hc-ingreso/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Error al obtener HC de Ingreso: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Error al obtener HC de Ingreso');
        }

        return result.data || null;
    } catch (error) {
        console.error('Error en obtenerHCIngresoPorId:', error);
        throw error;
    }
}

/**
 * Crear nueva HC de Ingreso
 */
export async function crearHCIngreso(data: Partial<HCIngresoRecord>): Promise<{ IdHCIngreso: number }> {
    try {
        const response = await apiFetch(`${API_URL}/hc-ingreso`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(result, `Error al crear HC de Ingreso (${response.status})`));
        }
        
        if (!result.success) {
            throw new Error(parseApiError(result, 'Error al crear HC de Ingreso'));
        }

        return result.data;
    } catch (error) {
        console.error('Error en crearHCIngreso:', error);
        throw error;
    }
}

/**
 * Actualizar HC de Ingreso
 */
export async function actualizarHCIngreso(id: number, data: Partial<HCIngresoRecord>): Promise<void> {
    try {
        const response = await apiFetch(`${API_URL}/hc-ingreso/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(result, `Error al actualizar HC de Ingreso (${response.status})`));
        }
        
        if (!result.success) {
            throw new Error(parseApiError(result, 'Error al actualizar HC de Ingreso'));
        }
    } catch (error) {
        console.error('Error en actualizarHCIngreso:', error);
        throw error;
    }
}

/**
 * Eliminar HC de Ingreso
 */
export async function eliminarHCIngreso(id: number): Promise<void> {
    try {
        const response = await apiFetch(`${API_URL}/hc-ingreso/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Error al eliminar HC de Ingreso: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Error al eliminar HC de Ingreso');
        }
    } catch (error) {
        console.error('Error en eliminarHCIngreso:', error);
        throw error;
    }
}
