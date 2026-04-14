import { 
  Adjunto, 
  SubirAdjuntoResponse, 
  SubirMultiplesAdjuntosResponse, 
  ListarAdjuntosResponse,
  AdjuntosAgrupadosResponse,
  TipoImagenHC
} from '../types/adjuntos';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const adjuntosService = {
  /**
   * Catálogo HCTiposImagenes (tipo de adjunto / estudio).
   */
  async getTiposImagenes(): Promise<TipoImagenHC[]> {
    const response = await fetch(`${API_URL}/adjuntos/tipos-imagenes`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Error al obtener tipos' }));
      throw new Error(error.error || 'Error al obtener tipos de imagen');
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

    const response = await fetch(`${API_URL}/adjuntos/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al subir archivo');
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

    const response = await fetch(`${API_URL}/adjuntos/upload-multiple`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al subir archivos');
    }

    return response.json();
  },

  /**
   * Obtener adjuntos de una visita
   */
  async getAdjuntosPorVisita(numeroVisita: number): Promise<ListarAdjuntosResponse> {
    const response = await fetch(`${API_URL}/adjuntos/visita/${numeroVisita}`);

    if (!response.ok) {
      // Si es 404 y no hay adjuntos, devolver array vacío en lugar de error
      if (response.status === 404) {
        return { success: true, data: [], total: 0 };
      }
      const error = await response.json().catch(() => ({ error: 'Error al obtener adjuntos' }));
      throw new Error(error.error || 'Error al obtener adjuntos');
    }

    return response.json();
  },

  /**
   * Obtener adjuntos de una visita agrupados por tipo de imagen
   */
  async getAdjuntosAgrupados(numeroVisita: number): Promise<AdjuntosAgrupadosResponse> {
    const response = await fetch(`${API_URL}/adjuntos/visita/${numeroVisita}/agrupados`);

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, data: [], totalGrupos: 0, totalAdjuntos: 0 };
      }
      const error = await response.json().catch(() => ({ error: 'Error al obtener adjuntos agrupados' }));
      throw new Error(error.error || 'Error al obtener adjuntos agrupados');
    }

    return response.json();
  },

  /**
   * Obtener información de un adjunto
   */
  async getAdjunto(idAdjunto: number): Promise<{ success: boolean; data: Adjunto }> {
    const response = await fetch(`${API_URL}/adjuntos/${idAdjunto}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener adjunto');
    }

    return response.json();
  },

  /**
   * Descargar archivo adjunto
   */
  async descargarArchivo(idAdjunto: number, nombreArchivo: string): Promise<void> {
    try {
      const url = `${API_URL}/adjuntos/${idAdjunto}/download`;
      
      // Fetch el archivo como blob
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Error al descargar archivo');
      }
      
      // Obtener el blob
      const blob = await response.blob();
      
      // Crear URL del blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Crear link temporal y descargar
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = nombreArchivo;
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error al descargar archivo:', error);
      throw error;
    }
  },

  /**
   * Eliminar adjunto
   */
  async eliminarAdjunto(idAdjunto: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/adjuntos/${idAdjunto}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar adjunto');
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
