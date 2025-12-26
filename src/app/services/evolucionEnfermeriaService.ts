import { EvolucionEnfermeria, EvolucionEnfermeriaResponse } from '../types/evolucionEnfermeria';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';

/**
 * Formatear fecha de YYYY-MM-DD a DD/MM/YYYY
 */
export function formatearFecha(fecha: string | null | undefined): string {
  if (!fecha) return '-';
  try {
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
}

/**
 * Formatear hora de HH:mm:ss a HH:mm
 */
export function formatearHora(hora: string | null | undefined): string {
  if (!hora) return '-';
  try {
    const [hh, mm] = hora.split(':');
    return `${hh}:${mm}`;
  } catch {
    return '-';
  }
}

/**
 * Obtener nombre completo del profesional u operador
 */
export function obtenerNombreCompleto(
  apellido: string | null | undefined,
  nombres: string | null | undefined
): string {
  if (!apellido && !nombres) return '-';
  if (!apellido) return nombres || '-';
  if (!nombres) return apellido || '-';
  return `${apellido}, ${nombres}`;
}

/**
 * Obtener evoluciones de enfermería por número de visita y fecha
 */
export async function obtenerEvolucionesPorVisitaYFecha(
  numeroVisita: number,
  fecha: string
): Promise<EvolucionEnfermeria[]> {
  try {
    const response = await fetch(
      `${API_URL}/evolucion-enfermeria/${numeroVisita}/byDate?fecha=${fecha}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data: EvolucionEnfermeriaResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.mensaje || 'Error al obtener evoluciones de enfermería');
    }

    return data.data || [];
  } catch (error) {
    console.error('Error al obtener evoluciones de enfermería:', error);
    throw error;
  }
}

/**
 * Eliminar una evolución de enfermería
 * Nota: La tabla usa clave compuesta (NumeroVisita, FechaControl, HoraControl)
 * Los valores de FechaControl y HoraControl deben estar en formato Clarion
 */
export async function eliminarEvolucion(
  numeroVisita: number,
  fechaControlClarion: number,
  horaControlClarion: number
): Promise<void> {
  try {
    const response = await fetch(
      `${API_URL}/evolucion-enfermeria/?numeroVisita=${numeroVisita}&fechaControl=${fechaControlClarion}&horaControl=${horaControlClarion}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.mensaje || 'Error al eliminar evolución de enfermería');
    }
  } catch (error) {
    console.error('Error al eliminar evolución de enfermería:', error);
    throw error;
  }
}

/**
 * Convertir fecha YYYY-MM-DD a formato Clarion
 * Base: 1801-01-01 con offset -4
 */
export function convertirFechaAClarion(fecha: string): number {
  const [year, month, day] = fecha.split('-').map(Number);
  const fechaObj = new Date(year, month - 1, day);
  const base = new Date(1801, 0, 1);
  const diffTime = fechaObj.getTime() - base.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 4;
}

/**
 * Convertir hora HH:mm:ss a formato Clarion TIME (milisegundos desde medianoche)
 */
export function convertirHoraAClarion(hora: string): number {
  const [hh, mm, ss] = hora.split(':').map(Number);
  const totalMs = (hh * 3600 + mm * 60 + ss) * 1000;
  return Math.floor(totalMs / 10) + 1;
}
