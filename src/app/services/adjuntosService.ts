import { apiFetch, apiFetchBlob, openAuthenticatedBlob } from '@/app/utils/authFetch';
import { 
  Adjunto, 
  SubirAdjuntoResponse, 
  SubirMultiplesAdjuntosResponse, 
  ListarAdjuntosResponse,
  AdjuntosAgrupadosResponse,
  TipoImagenHC
} from '../types/adjuntos';
import { getResolvedApiBaseUrl } from './axios';

const getApiUrl = () => getResolvedApiBaseUrl();

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
  /**
   * Catálogo HCTiposImagenes (tipo de adjunto / estudio).
   */
  async getTiposImagenes(): Promise<TipoImagenHC[]> {
    const response = await apiFetch(`${getApiUrl()}/adjuntos/tipos-imagenes`);
    if (!response.ok) {
      const msg = await extractErrorMessage(response, 'Error al obtener tipos de imagen');
      throw new Error(msg);
    }
    const json = await response.json();
    return json.data ?? [];
  },

  /**
   * Subir un archivo adjunto
   */
  async subirArchivo(numeroVisita: number, archivo: File, tipoImagen: string): Promise<SubirAdjuntoResponse> {
    const formData = new FormData();
    formData.append('numeroVisita', numeroVisita.toString());
    formData.append('tipoImagen', tipoImagen.trim());
    formData.append('archivo', archivo);

    const response = await apiFetch(`${getApiUrl()}/adjuntos/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const msg = await extractErrorMessage(response, 'Error al subir archivo');
      throw new Error(msg);
    }

    return response.json();
  },

  /**
   * Subir múltiples archivos adjuntos
   */
  async subirArchivos(numeroVisita: number, archivos: File[], tipoImagen: string): Promise<SubirMultiplesAdjuntosResponse> {
    const formData = new FormData();
    formData.append('numeroVisita', numeroVisita.toString());
    formData.append('tipoImagen', tipoImagen.trim());
    
    archivos.forEach(archivo => {
      formData.append('archivos', archivo);
    });

    const response = await apiFetch(`${getApiUrl()}/adjuntos/upload-multiple`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const msg = await extractErrorMessage(response, 'Error al subir archivos');
      throw new Error(msg);
    }

    return response.json();
  },

  /**
   * Obtener adjuntos de una visita
   */
  async getAdjuntosPorVisita(numeroVisita: number): Promise<ListarAdjuntosResponse> {
    const response = await apiFetch(`${getApiUrl()}/adjuntos/visita/${numeroVisita}`);

    if (!response.ok) {
      // Si es 404 y no hay adjuntos, devolver array vacío en lugar de error
      if (response.status === 404) {
        return { success: true, data: [], total: 0 };
      }
      const msg = await extractErrorMessage(response, 'Error al obtener adjuntos');
      throw new Error(msg);
    }

    return response.json();
  },

  /**
   * Obtener adjuntos de una visita agrupados por tipo de imagen
   */
  async getAdjuntosAgrupados(numeroVisita: number): Promise<AdjuntosAgrupadosResponse> {
    const response = await apiFetch(`${getApiUrl()}/adjuntos/visita/${numeroVisita}/agrupados`);

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, data: [], totalGrupos: 0, totalAdjuntos: 0 };
      }
      const msg = await extractErrorMessage(response, 'Error al obtener adjuntos agrupados');
      throw new Error(msg);
    }

    return response.json();
  },

  /**
   * Obtener información de un adjunto
   */
  async getAdjunto(idAdjunto: number): Promise<{ success: boolean; data: Adjunto }> {
    const response = await apiFetch(`${getApiUrl()}/adjuntos/${idAdjunto}`);

    if (!response.ok) {
      const msg = await extractErrorMessage(response, 'Error al obtener adjunto');
      throw new Error(msg);
    }

    return response.json();
  },

  /**
   * Descargar archivo adjunto (con JWT — requerido en producción/Render).
   */
  async descargarArchivo(idAdjunto: number, nombreArchivo: string): Promise<void> {
    try {
      const blob = await apiFetchBlob(`/adjuntos/${idAdjunto}/download`);
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = nombreArchivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error al descargar archivo:', error);
      throw error;
    }
  },

  /**
   * Visualizar adjunto en pestaña nueva (con JWT).
   */
  async abrirArchivo(idAdjunto: number): Promise<void> {
    await openAuthenticatedBlob(`/adjuntos/${idAdjunto}/download`);
  },

  /**
   * Eliminar adjunto
   */
  async eliminarAdjunto(idAdjunto: number): Promise<{ success: boolean; message: string }> {
    const response = await apiFetch(`${getApiUrl()}/adjuntos/${idAdjunto}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const msg = await extractErrorMessage(response, 'Error al eliminar adjunto');
      throw new Error(msg);
    }

    return response.json();
  },

  /**
   * Formatear tamaño de archivo
   */
  formatearTamanio(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Obtener icono según tipo de archivo
   */
  getIconoTipo(tipoArchivo: string): string {
    if (tipoArchivo.includes('pdf')) return '📄';
    if (tipoArchivo.includes('image')) return '🖼️';
    if (tipoArchivo.includes('word')) return '📝';
    return '📎';
  }
};
