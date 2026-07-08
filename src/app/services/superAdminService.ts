import { apiService } from './axios';
import type {
  ActualizarUsuarioEmpresaBody,
  CatalogoSector,
  ConfigPlataforma,
  CrearUsuarioEmpresaBody,
  EmpresaAdmin,
  EmpresaConexion,
  EmpresaUsuario,
  PreviewTabla,
  ResultadoImport,
  SectorBody,
  SuperAdminCatalogos,
  SuperAdminDashboard,
  TablaImportable,
  UsuarioPlataforma,
} from '../types/superAdmin';

const BASE = '/super-admin';

function importarTablasError(e: unknown): string | null {
  if (!e || typeof e !== 'object') return null;
  const err = e as {
    code?: string;
    response?: { data?: { mensaje?: string } };
  };
  if (err.code === 'ECONNABORTED') {
    return 'La importación tardó demasiado en responder (timeout). Revisá los logs de Railway: puede haber terminado parcialmente. Volvé a detectar tablas e intentá de nuevo.';
  }
  const msg = err.response?.data?.mensaje;
  return typeof msg === 'string' && msg.trim() ? msg : null;
}

export const superAdminService = {
  async getDashboard(): Promise<SuperAdminDashboard> {
    const res = await apiService.get<{ success: boolean; data: SuperAdminDashboard }>(`${BASE}/dashboard`);
    return res.data.data;
  },

  async getCatalogos(): Promise<SuperAdminCatalogos> {
    const res = await apiService.get<{ success: boolean; data: SuperAdminCatalogos }>(`${BASE}/catalogos`);
    return res.data.data;
  },

  async getCatalogosEmpresa(id: string | number): Promise<SuperAdminCatalogos> {
    const res = await apiService.get<{ success: boolean; data: SuperAdminCatalogos }>(
      `${BASE}/empresas/${id}/catalogos`,
    );
    return res.data.data;
  },

  async listEmpresas(q?: string): Promise<EmpresaAdmin[]> {
    const res = await apiService.get<{ success: boolean; data: EmpresaAdmin[] }>(`${BASE}/empresas`, {
      params: q ? { q } : undefined,
    });
    return res.data.data;
  },

  async getEmpresa(id: string | number): Promise<EmpresaAdmin> {
    const res = await apiService.get<{ success: boolean; data: EmpresaAdmin }>(`${BASE}/empresas/${id}`);
    return res.data.data;
  },

  async createEmpresa(body: Partial<EmpresaAdmin> & { packs?: string[] }): Promise<EmpresaAdmin> {
    const res = await apiService.post<{ success: boolean; data: EmpresaAdmin }>(`${BASE}/empresas`, body);
    return res.data.data;
  },

  async updateEmpresa(id: string | number, body: Partial<EmpresaAdmin>): Promise<EmpresaAdmin> {
    const res = await apiService.put<{ success: boolean; data: EmpresaAdmin }>(`${BASE}/empresas/${id}`, body);
    return res.data.data;
  },

  async updateConexion(id: string | number, body: EmpresaAdmin['conexion']): Promise<EmpresaAdmin> {
    const res = await apiService.put<{ success: boolean; data: EmpresaAdmin }>(
      `${BASE}/empresas/${id}/conexion`,
      body || {},
    );
    return res.data.data;
  },

  async probarConexion(id: string | number): Promise<{ ok: boolean }> {
    const res = await apiService.post<{ success: boolean; data: { ok: boolean } }>(
      `${BASE}/empresas/${id}/conexion/probar`,
    );
    return res.data.data;
  },

  async probarConexionDatos(body: EmpresaConexion): Promise<{ ok: boolean; error?: string }> {
    const res = await apiService.post<{ success: boolean; data: { ok: boolean; error?: string } }>(
      `${BASE}/conexion/probar`,
      body || {},
    );
    return res.data.data;
  },

  async getTablasImportables(id: string | number): Promise<TablaImportable[]> {
    const res = await apiService.get<{ success: boolean; data: TablaImportable[] }>(
      `${BASE}/empresas/${id}/importar/tablas`,
    );
    return res.data.data;
  },

  async getPreviewTabla(id: string | number, tabla: string, limite = 50): Promise<PreviewTabla> {
    const res = await apiService.get<{ success: boolean; data: PreviewTabla }>(
      `${BASE}/empresas/${id}/importar/tablas/${encodeURIComponent(tabla)}/preview`,
      { params: { limite } },
    );
    return res.data.data;
  },

  async importarTablas(id: string | number, tablas: string[]): Promise<ResultadoImport> {
    try {
      const res = await apiService.post<{ success: boolean; data: ResultadoImport; mensaje?: string }>(
        `${BASE}/empresas/${id}/importar`,
        { tablas },
        { timeout: 300_000 },
      );
      if (!res.data.success) {
        throw new Error(res.data.mensaje || 'Error al importar');
      }
      return res.data.data;
    } catch (e) {
      const msg = importarTablasError(e);
      if (msg) throw new Error(msg);
      throw e;
    }
  },

  async deleteEmpresa(id: string | number): Promise<void> {
    await apiService.delete(`${BASE}/empresas/${id}`);
  },

  async updatePacks(id: string | number, packs: string[]): Promise<unknown> {
    const res = await apiService.put<{ success: boolean; data: unknown }>(`${BASE}/empresas/${id}/packs`, {
      packs,
    });
    return res.data.data;
  },

  async updateOnboarding(
    id: string | number,
    body: { pasoActual?: string; completado?: boolean; notas?: string; sectoresDefecto?: string[] },
  ) {
    const res = await apiService.put<{ success: boolean; data: unknown }>(
      `${BASE}/empresas/${id}/onboarding`,
      body,
    );
    return res.data.data;
  },

  async crearUsuarioEmpresa(idEmpresa: number, body: CrearUsuarioEmpresaBody): Promise<EmpresaUsuario> {
    const res = await apiService.post<{ success: boolean; data: EmpresaUsuario }>(
      `${BASE}/empresas/${idEmpresa}/usuarios/nuevo`,
      body,
    );
    return res.data.data;
  },

  async actualizarUsuarioEmpresa(
    idEmpresa: number,
    idPersonal: number,
    body: ActualizarUsuarioEmpresaBody,
  ): Promise<EmpresaUsuario> {
    const res = await apiService.put<{ success: boolean; data: EmpresaUsuario }>(
      `${BASE}/empresas/${idEmpresa}/usuarios/${idPersonal}`,
      body,
    );
    return res.data.data;
  },

  async desvincularUsuarioEmpresa(idEmpresa: number, idPersonal: number): Promise<void> {
    await apiService.delete(`${BASE}/empresas/${idEmpresa}/usuarios/${idPersonal}`);
  },

  async crearSector(body: SectorBody): Promise<CatalogoSector> {
    const res = await apiService.post<{ success: boolean; data: CatalogoSector }>(`${BASE}/sectores`, body);
    return res.data.data;
  },

  async actualizarSector(valor: string, body: SectorBody): Promise<CatalogoSector> {
    const res = await apiService.put<{ success: boolean; data: CatalogoSector }>(
      `${BASE}/sectores/${encodeURIComponent(valor)}`,
      body,
    );
    return res.data.data;
  },

  async eliminarSector(valor: string, idEmpresa: number): Promise<void> {
    await apiService.delete(`${BASE}/sectores/${encodeURIComponent(valor)}`, {
      params: { idEmpresa },
    });
  },

  async updateSuscripcion(id: string | number, body: Record<string, unknown>) {
    const res = await apiService.put<{ success: boolean; data: unknown }>(
      `${BASE}/empresas/${id}/suscripcion`,
      body,
    );
    return res.data.data;
  },

  async listUsuarios(q?: string): Promise<UsuarioPlataforma[]> {
    const res = await apiService.get<{ success: boolean; data: UsuarioPlataforma[] }>(`${BASE}/usuarios`, {
      params: q ? { q } : undefined,
    });
    return res.data.data;
  },

  async vincularUsuario(idEmpresa: number, idPersonal: number) {
    const res = await apiService.post<{ success: boolean; data: unknown }>(
      `${BASE}/empresas/${idEmpresa}/usuarios`,
      { idPersonal },
    );
    return res.data.data;
  },

  async desvincularUsuario(idEmpresa: number, idPersonal: number) {
    const res = await apiService.delete<{ success: boolean; data: unknown }>(
      `${BASE}/empresas/${idEmpresa}/usuarios/${idPersonal}`,
    );
    return res.data.data;
  },

  async getConfig(): Promise<ConfigPlataforma[]> {
    const res = await apiService.get<{ success: boolean; data: ConfigPlataforma[] }>(`${BASE}/config`);
    return res.data.data;
  },

  async saveConfig(clave: string, valor: string): Promise<ConfigPlataforma[]> {
    const res = await apiService.put<{ success: boolean; data: ConfigPlataforma[] }>(`${BASE}/config`, {
      clave,
      valor,
    });
    return res.data.data;
  },
};
