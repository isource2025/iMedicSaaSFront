import { apiFetch } from '@/app/utils/authFetch';

export interface FeriadoTabla {
  Fecha: string;
  Descripcion: string;
}

const apiUrl = () => process.env.NEXT_PUBLIC_API_URL || '';

function mapRow(row: { fecha?: string; nombre?: string }): FeriadoTabla {
  return {
    Fecha: String(row?.fecha || '').slice(0, 10),
    Descripcion: String(row?.nombre || '').trim() || 'Feriado',
  };
}

async function parseError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return body?.message || fallback;
  } catch {
    return fallback;
  }
}

export async function getFeriadosTabla(): Promise<FeriadoTabla[]> {
  const response = await apiFetch(`${apiUrl()}/feriados-tabla`);
  if (!response.ok) {
    throw new Error(await parseError(response, 'Error al obtener feriados'));
  }
  const result = await response.json();
  const rows = Array.isArray(result?.data) ? result.data : [];
  return rows.map(mapRow).filter((r: FeriadoTabla) => r.Fecha);
}

export async function createFeriadoTabla(item: FeriadoTabla): Promise<void> {
  const response = await apiFetch(`${apiUrl()}/feriados-tabla`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Fecha: item.Fecha, Descripcion: item.Descripcion }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Error al crear feriado'));
  }
}

export async function updateFeriadoTabla(fecha: string, item: FeriadoTabla): Promise<void> {
  const response = await apiFetch(`${apiUrl()}/feriados-tabla/${encodeURIComponent(fecha)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Fecha: item.Fecha, Descripcion: item.Descripcion }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Error al actualizar feriado'));
  }
}

export async function deleteFeriadoTabla(fecha: string): Promise<void> {
  const response = await apiFetch(`${apiUrl()}/feriados-tabla/${encodeURIComponent(fecha)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Error al eliminar feriado'));
  }
}
