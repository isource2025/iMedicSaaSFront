import { apiService } from './axios';
import type {
	CatalogosRendicion,
	DatosCabeceraRendicion,
	EstadoRendicion,
	FacturaRendicion,
	LineaRendida,
	ListadoRendiciones,
	Pagina,
	Rendicion,
	RendicionDetalle,
	TipoPrestacion,
	VisitaRendida,
} from '@/app/types/rendiciones';

type Resp<T> = { success: boolean; data: T };

const CARGA = { timeout: 60000 };

const dato = async <T>(p: Promise<{ data: Resp<T> }>): Promise<T> => (await p).data.data;

export interface FiltrosRendiciones {
	q?: string;
	cliente?: number | '';
	convenio?: number | '';
	tipo?: string;
	estado?: EstadoRendicion | '';
	/** YYYY-MM */
	desde?: string;
	/** YYYY-MM */
	hasta?: string;
	pagina?: number;
	tamPagina?: number;
}

/** Saca los filtros vacíos para no mandar `cliente=` y similares. */
const limpio = (f: object) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export const rendicionesService = {
	catalogos: () => dato<CatalogosRendicion>(apiService.get('/rendiciones/catalogos', CARGA)),

	listar: (filtros: FiltrosRendiciones) =>
		dato<ListadoRendiciones>(apiService.get('/rendiciones', { ...CARGA, params: limpio(filtros) })),

	exportar: (filtros: FiltrosRendiciones) =>
		dato<Rendicion[]>(apiService.get('/rendiciones/exportar', { timeout: 120000, params: limpio(filtros) })),

	obtener: (id: number) => dato<RendicionDetalle>(apiService.get(`/rendiciones/${id}`, CARGA)),

	visitas: (id: number, params: { q?: string; sinValor?: boolean; pagina?: number; tamPagina?: number }) =>
		dato<Pagina<VisitaRendida>>(
			apiService.get(`/rendiciones/${id}/visitas`, { ...CARGA, params: limpio({ ...params, sinValor: params.sinValor ? 1 : '' }) }),
		),

	lineas: (
		id: number,
		params: { visita?: number; tipo?: TipoPrestacion | ''; sinValor?: boolean; pagina?: number; tamPagina?: number },
	) =>
		dato<Pagina<LineaRendida>>(
			apiService.get(`/rendiciones/${id}/lineas`, { ...CARGA, params: limpio({ ...params, sinValor: params.sinValor ? 1 : '' }) }),
		),

	facturas: (id: number) => dato<FacturaRendicion[]>(apiService.get(`/rendiciones/${id}/facturas`, CARGA)),

	crear: (datos: DatosCabeceraRendicion) => dato<RendicionDetalle>(apiService.post('/rendiciones', datos)),

	actualizar: (id: number, datos: Partial<DatosCabeceraRendicion>) =>
		dato<RendicionDetalle>(apiService.put(`/rendiciones/${id}`, datos)),

	eliminar: (id: number) => dato<{ id: number }>(apiService.delete(`/rendiciones/${id}`)),
};
