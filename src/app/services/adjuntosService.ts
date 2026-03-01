import { 
  Adjunto, 
  SubirAdjuntoResponse, 
  SubirMultiplesAdjuntosResponse, 
  ListarAdjuntosResponse 
} from '../types/adjuntos';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const adjuntosService = {
  /**
   * Subir un archivo adjunto
   */
  async subirArchivo(numeroVisita: number, archivo: File): Promise<SubirAdjuntoResponse> {
    const formData = new FormData();
    formData.append('numeroVisita', numeroVisita.toString());
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
  async subirArchivos(numeroVisita: number, archivos: File[]): Promise<SubirMultiplesAdjuntosResponse> {
    const formData = new FormData();
    formData.append('numeroVisita', numeroVisita.toString());
    
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
  descargarArchivo(idAdjunto: number, nombreArchivo: string): void {
    const url = `${API_URL}/adjuntos/${idAdjunto}/download`;
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
