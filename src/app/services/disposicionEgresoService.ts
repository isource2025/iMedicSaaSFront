import { DisposicionEgreso } from '../types/disposicionEgreso.types';
import { apiFetch } from '@/app/utils/authFetch';

function normalizeDisposiciones(payload: unknown): DisposicionEgreso[] {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? ((payload as { data: unknown[] }).data)
      : [];

  return rows
    .map((item) => {
      const row = item as Record<string, unknown>;
      const valorRaw = row.Valor ?? row.valor;
      const descripcion = String(row.Descripcion ?? row.descripcion ?? '').trim();
      const valor = Number(valorRaw);
      if (!Number.isFinite(valor) || !descripcion) return null;
      return { Valor: valor, Descripcion: descripcion };
    })
    .filter((item): item is DisposicionEgreso => item != null);
}

/**
 * Obtiene todas las disposiciones de egreso desde imDisposicionEgreso
 */
export const getDisposicionesEgreso = async (): Promise<DisposicionEgreso[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    // Preferimos el catálogo montado; fallback a la ruta CRUD dedicada
    let response = await apiFetch('/catalogs/disposiciones-egreso', {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      response = await apiFetch('/disposiciones-egreso', {
        method: 'GET',
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return normalizeDisposiciones(data);
  } catch (error) {
    console.error('Error al obtener disposiciones de egreso:', error);
    return [];
  }
};

/**
 * Crea una nueva disposición de egreso
 */
export const createDisposicionEgreso = async (
  disposicionEgreso: DisposicionEgreso,
): Promise<DisposicionEgreso | null> => {
  try {
    const response = await apiFetch('/disposiciones-egreso', {
      method: 'POST',
      body: JSON.stringify(disposicionEgreso),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data as DisposicionEgreso;
  } catch (error) {
    console.error('Error al crear disposición de egreso:', error);
    throw error;
  }
};

/**
 * Actualiza una disposición de egreso existente
 */
export const updateDisposicionEgreso = async (
  valor: number,
  descripcion: string,
): Promise<DisposicionEgreso | null> => {
  try {
    const response = await apiFetch(`/disposiciones-egreso/${valor}`, {
      method: 'PUT',
      body: JSON.stringify({ Descripcion: descripcion }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data as DisposicionEgreso;
  } catch (error) {
    console.error(`Error al actualizar disposición de egreso con valor ${valor}:`, error);
    throw error;
  }
};

/**
 * Elimina una disposición de egreso existente
 */
export const deleteDisposicionEgreso = async (valor: number): Promise<void> => {
  try {
    const response = await apiFetch(`/disposiciones-egreso/${valor}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error al eliminar disposición de egreso con valor ${valor}:`, error);
    throw error;
  }
};

const disposicionEgresoService = {
  getDisposicionesEgreso,
  createDisposicionEgreso,
  updateDisposicionEgreso,
  deleteDisposicionEgreso,
};

export default disposicionEgresoService;
