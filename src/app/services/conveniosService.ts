import { apiService } from './axios';
import type {
	CabeceraConvenio,
	CatalogosConvenio,
	ConvenioDetalle,
	ExportacionConvenio,
	ListadoConvenios,
	LoteCambios,
	PaginaPestana,
	ParametrosAjuste,
	PestanaId,
	PreviaAjuste,
	ReporteMantenimiento,
	ResultadoCatalogo,
	ResultadoLote,
	UsoConvenio,
} from '@/app/types/convenios';

type Resp<T> = { success: boolean; data: T };

/** Guardar un lote del nomenclador dispara la resincronización de prácticas: puede tardar. */
const LARGO = { timeout: 120000 };
const CARGA = { timeout: 60000 };

const dato = async <T>(p: Promise<{ data: Resp<T> }>): Promise<T> => (await p).data.data;

export interface FiltrosListado {
	q?: string;
	obraSocial?: number | '';
	estado?: string;
	pagina?: number;
	tamPagina?: number;
}

export const conveniosService = {
	catalogos: () => dato<CatalogosConvenio>(apiService.get('/convenios/catalogos', CARGA)),

	buscarEnCatalogo: (tipo: 'nomenclador' | 'moduladas' | 'vademecum', q: string) =>
		dato<ResultadoCatalogo[]>(apiService.get(`/convenios/catalogos/${tipo}/buscar`, { params: { q } })),

	listar: (filtros: FiltrosListado) =>
		dato<ListadoConvenios>(apiService.get('/convenios', { ...CARGA, params: filtros })),

	obtener: (codigo: number) => dato<ConvenioDetalle>(apiService.get(`/convenios/${codigo}`)),

	uso: (codigo: number) => dato<UsoConvenio[]>(apiService.get(`/convenios/${codigo}/uso`)),

	crear: (cabecera: CabeceraConvenio) => dato<ConvenioDetalle>(apiService.post('/convenios', cabecera)),

	actualizar: (codigo: number, cabecera: CabeceraConvenio) =>
		dato<ConvenioDetalle>(apiService.put(`/convenios/${codigo}`, cabecera)),

	pestana: (
		codigo: number,
		pestana: PestanaId,
		params: { q?: string; funcion?: number | ''; pagina?: number; tamPagina?: number } = {},
	) => dato<PaginaPestana>(apiService.get(`/convenios/${codigo}/pestanas/${pestana}`, { params })),

	guardarLote: (codigo: number, pestana: PestanaId, lote: LoteCambios) =>
		dato<ResultadoLote>(apiService.post(`/convenios/${codigo}/pestanas/${pestana}/lote`, lote, LARGO)),

	previsualizarAjuste: (codigo: number, params: ParametrosAjuste) =>
		dato<PreviaAjuste>(apiService.post(`/convenios/${codigo}/ajuste/preview`, params)),

	aplicarAjuste: (codigo: number, params: ParametrosAjuste) =>
		dato<{ porcentaje: number; pestanas: { pestana: PestanaId; filas: number }[] }>(
			apiService.post(`/convenios/${codigo}/ajuste`, params, LARGO),
		),

	duplicar: (
		codigo: number,
		body: {
			descripcion: string;
			obraSocial: number;
			vigenciaDesde: string | null;
			vigenciaHasta: string | null;
			ajustePorcentaje?: number | string | null;
		},
	) =>
		dato<ConvenioDetalle & { copiadas: Record<PestanaId, number> }>(
			apiService.post(`/convenios/${codigo}/duplicar`, body, LARGO),
		),

	exportar: (codigo: number) =>
		dato<ExportacionConvenio>(apiService.get(`/convenios/${codigo}/exportar`, LARGO)),

	mantenimiento: () => dato<ReporteMantenimiento>(apiService.get('/convenios/mantenimiento', LARGO)),

	limpiarHuerfanas: (pestanas?: PestanaId[]) =>
		dato<Record<string, number>>(
			apiService.post('/convenios/mantenimiento/limpiar-huerfanas', { pestanas }, LARGO),
		),
};

/** Lista de problemas por fila que manda el back en los 400/409 de validación. */
export function detallesDeError(error: unknown): string[] {
	const d = (error as { response?: { data?: { detalles?: unknown } } })?.response?.data?.detalles;
	return Array.isArray(d) ? d.map(String) : [];
}
