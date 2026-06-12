import { apiFetch, apiFetchBlob } from '@/app/utils/authFetch';
import {
  Adjunto,
  SubirAdjuntoResponse,
  SubirMultiplesAdjuntosResponse,
  ListarAdjuntosResponse,
  AdjuntosAgrupadosResponse,
  TipoImagenHC
} from '../types/adjuntos';

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json();
    return payload?.error || payload?.mensaje || fallback;
  } catch {
    try {
      const text = await response.text();
      return text || fallback;
    } catch {
      return fallback;
    }
  }
}

export const adjuntosService = {
  async getTiposImagenes(): Promise<TipoImagenHC[]> {
    const response = await apiFetch('/adjuntos/tipos-imagenes');
    if (!response.ok) {
      const msg = await extractErrorMessage(response, 'Error al obtener tipos de imagen');
      throw new Error(msg);
    }
    const json = await response.json();
    return json.data ?? [];
  },

  async subirArchivo(numeroVisita: number, archivo: File, tipoImagen: string): Promise<SubirAdjuntoResponse> {
    const formData = new FormData();
    formData.append('numeroVisita', numeroVisita.toString());
    formData.append('tipoImagen', tipoImagen.trim());
    formData.append('archivo', archivo);

    const response = await apiFetch('/adjuntos/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const msg = await extractErrorMessage(response, 'Error al subir archivo');
      throw new Error(msg);
    }

    return response.json();
  },

  async subirArchivos(numeroVisita: number, archivos: File[], tipoImagen: string): Promise<SubirMultiplesAdjuntosResponse> {
    const formData = new FormData();
    formData.append('numeroVisita', numeroVisita.toString());
    formData.append('tipoImagen', tipoImagen.trim());

    archivos.forEach((archivo) => {
      formData.append('archivos', archivo);
    });

    const response = await apiFetch('/adjuntos/upload-multiple', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const msg = await extractErrorMessage(response, 'Error al subir archivos');
      throw new Error(msg);
    }

    return response.json();
  },

  async getAdjuntosPorVisita(numeroVisita: number): Promise<ListarAdjuntosResponse> {
    const response = await apiFetch(`/adjuntos/visita/${numeroVisita}`);

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, data: [], total: 0 };
      }
      const msg = await extractErrorMessage(response, 'Error al obtener adjuntos');
      throw new Error(msg);
    }

    return response.json();
  },

  async getAdjuntosAgrupados(numeroVisita: number): Promise<AdjuntosAgrupadosResponse> {
    const response = await apiFetch(`/adjuntos/visita/${numeroVisita}/agrupados`);

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, data: [], totalGrupos: 0, totalAdjuntos: 0 };
      }
      const msg = await extractErrorMessage(response, 'Error al obtener adjuntos agrupados');
      throw new Error(msg);
    }

    return response.json();
  },

  async getAdjunto(idAdjunto: number): Promise<{ success: boolean; data: Adjunto }> {
    const response = await apiFetch(`/adjuntos/${idAdjunto}`);

    if (!response.ok) {
      const msg = await extractErrorMessage(response, 'Error al obtener adjunto');
      throw new Error(msg);
    }

    return response.json();
  },

  async descargarArchivo(idAdjunto: number, nombreArchivo: string): Promise<void> {
    const blob = await apiFetchBlob(`/adjuntos/${idAdjunto}/download`);
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = nombreArchivo || 'adjunto';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
  },

  async cargarBlobAdjunto(idAdjunto: number): Promise<{ blob: Blob; blobUrl: string }> {
    const blob = await apiFetchBlob(`/adjuntos/${idAdjunto}/download`);
    return { blob, blobUrl: URL.createObjectURL(blob) };
  },

  revocarBlobUrl(blobUrl: string | null | undefined) {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  },

  async eliminarAdjunto(idAdjunto: number): Promise<{ success: boolean; message: string }> {
    const response = await apiFetch(`/adjuntos/${idAdjunto}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const msg = await extractErrorMessage(response, 'Error al eliminar adjunto');
      throw new Error(msg);
    }

    return response.json();
  },

  formatearTamanio(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  getIconoTipo(tipoArchivo: string): string {
    if (tipoArchivo.includes('pdf')) return '📄';
    if (tipoArchivo.includes('image')) return '🖼️';
    if (tipoArchivo.includes('word')) return '📝';
    return '📎';
  }
};
