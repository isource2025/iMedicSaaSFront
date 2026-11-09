import { apiFetch } from '@/app/utils/authFetch';

export interface PacsEstudio {
  studyInstanceUid: string;
  studyDate: string;
  studyTime: string;
  studyDescription: string;
  accessionNumber: string;
  patientId: string;
  patientsName: string;
  seriesCount: number;
  instanceCount: number;
}

export interface PacsSerie {
  seriesInstanceUid: string;
  seriesNumber: string;
  modality: string;
  seriesDescription: string;
  instanceCount: number;
}

export interface PacsArchivo {
  path: string;
  size: number;
}

async function readError(res: Response, fallback: string): Promise<Error & { code?: string }> {
  let message = fallback;
  let code: string | undefined;
  try {
    const body = await res.json();
    message = body?.error || body?.mensaje || fallback;
    code = body?.code;
  } catch {
    /* sin cuerpo JSON */
  }
  if (res.status === 403) message = 'No tenés permiso para ver estudios de imágenes.';
  const err = new Error(message) as Error & { code?: string };
  err.code = code;
  return err;
}

async function getJson<T>(path: string, fallback: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) throw await readError(res, fallback);
  return res.json() as Promise<T>;
}

export function normalizarDni(dni: string | number | null | undefined): string {
  return String(dni ?? '').replace(/\D/g, '');
}

export const pacsService = {
  async listarEstudios(dni: string): Promise<PacsEstudio[]> {
    const id = normalizarDni(dni);
    const data = await getJson<{ studies?: PacsEstudio[] }>(
      `/pacs/pacientes/${encodeURIComponent(id)}/estudios`,
      'No se pudieron obtener los estudios del PACS',
    );
    return data.studies ?? [];
  },

  async listarSeries(studyUid: string): Promise<PacsSerie[]> {
    const data = await getJson<{ series?: PacsSerie[] }>(
      `/pacs/estudios/${encodeURIComponent(studyUid)}/series`,
      'No se pudieron obtener las series',
    );
    return data.series ?? [];
  },

  async listarArchivos(studyUid: string): Promise<PacsArchivo[]> {
    const data = await getJson<{ files?: PacsArchivo[] }>(
      `/pacs/estudios/${encodeURIComponent(studyUid)}/files`,
      'No se pudieron obtener las imágenes del estudio',
    );
    return data.files ?? [];
  },

  async descargarArchivo(studyUid: string, path: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    const res = await apiFetch(
      `/pacs/estudios/${encodeURIComponent(studyUid)}/file?path=${encodeURIComponent(path)}`,
      { signal },
    );
    if (!res.ok) throw await readError(res, 'No se pudo descargar la imagen');
    return res.arrayBuffer();
  },
};
