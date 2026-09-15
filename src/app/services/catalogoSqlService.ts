import { apiService } from './axios';

export interface CatalogoSqlColumn {
  key: string;
  label: string;
  editable?: boolean;
}

interface Envelope<T> {
  success: boolean;
  data: T;
  columns?: CatalogoSqlColumn[];
  keyField?: string;
  title?: string;
  id?: string;
  message?: string;
}

export interface CatalogoSqlPayload<T = Record<string, unknown>> {
  rows: T[];
  columns: CatalogoSqlColumn[];
  keyField: string;
  title: string;
  id: string;
}

function unpack<T>(env: Envelope<T[]>): CatalogoSqlPayload<T> {
  return {
    rows: env.data ?? [],
    columns: env.columns ?? [],
    keyField: env.keyField || 'Valor',
    title: env.title || '',
    id: env.id || '',
  };
}

export const catalogoSqlService = {
  async listar(id: string): Promise<CatalogoSqlPayload> {
    const { data } = await apiService.get<Envelope<Record<string, unknown>[]>>(`/catalogos-sql/${id}`);
    return unpack(data);
  },
  async crear(id: string, values: Record<string, string>): Promise<CatalogoSqlPayload> {
    const { data } = await apiService.post<Envelope<Record<string, unknown>[]>>(
      `/catalogos-sql/${id}`,
      values,
    );
    return unpack(data);
  },
  async actualizar(
    id: string,
    clave: string,
    values: Record<string, string>,
  ): Promise<CatalogoSqlPayload> {
    const { data } = await apiService.put<Envelope<Record<string, unknown>[]>>(
      `/catalogos-sql/${id}/${encodeURIComponent(clave)}`,
      values,
    );
    return unpack(data);
  },
  async borrar(id: string, clave: string): Promise<CatalogoSqlPayload> {
    const { data } = await apiService.delete<Envelope<Record<string, unknown>[]>>(
      `/catalogos-sql/${id}/${encodeURIComponent(clave)}`,
    );
    return unpack(data);
  },
};

export default catalogoSqlService;
