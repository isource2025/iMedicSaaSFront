import { apiService } from './axios';
import type {
	CatalogosRendicion,
	DatosCabeceraRendicion,
	EstadoRendicion,
	FacturaRendicion,
	FiltrosReporteDetalle,
	FiltrosReportePracticaDetalle,
	FiltrosReportePracticaResumen,
	FiltrosReporteProfesional,
	FiltrosReporteProfesionalSumario,
	FiltrosReporteResumen,
	LineaRendida,
	ListadoRendiciones,
	OpcionesPracticaDetalle,
	Pagina,
	ProfesionalRendicion,
	Rendicion,
	RendicionDetalle,
	ReporteDetalle,
	ReportePracticaDetalle,
	ReportePracticaResumen,
	ReporteProfesional,
	ReporteProfesionalSumario,
	ReporteResumen,
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

	reporteResumen: (id: number, filtros: FiltrosReporteResumen) => {
		const tipos = (filtros.tipos?.length ? filtros.tipos : ['G', 'H', 'M']).join(',');
		const letras =
			!filtros.letras?.length || filtros.letras.includes('*') ? '' : filtros.letras.join(',');
		const visitas =
			filtros.todasLasAdmisiones || !filtros.visitas?.length ? '' : filtros.visitas.join(',');
		return dato<ReporteResumen>(
			apiService.get(`/rendiciones/${id}/reporte-resumen`, {
				timeout: 120000,
				params: limpio({
					clasePaciente: filtros.clasePaciente || '',
					tipos,
					letras,
					visitas,
				}),
			}),
		);
	},

	reporteDetalle: (id: number, filtros: FiltrosReporteDetalle) => {
		const tipos = (filtros.tipos?.length ? filtros.tipos : ['G', 'H', 'M']).join(',');
		const letras =
			!filtros.letras?.length || filtros.letras.includes('*') ? '' : filtros.letras.join(',');
		const visitas =
			filtros.todasLasAdmisiones || !filtros.visitas?.length ? '' : filtros.visitas.join(',');
		return dato<ReporteDetalle>(
			apiService.get(`/rendiciones/${id}/reporte-detalle`, {
				timeout: 120000,
				params: limpio({
					clasePaciente: filtros.clasePaciente || '',
					tipos,
					letras,
					visitas,
				}),
			}),
		);
	},

	reporteProfesional: (id: number, filtros: FiltrosReporteProfesional) => {
		const letras =
			!filtros.letras?.length || filtros.letras.includes('*') ? '' : filtros.letras.join(',');
		const visitas =
			filtros.todasLasAdmisiones || !filtros.visitas?.length ? '' : filtros.visitas.join(',');
		return dato<ReporteProfesional>(
			apiService.get(`/rendiciones/${id}/reporte-profesional`, {
				timeout: 120000,
				params: limpio({
					clasePaciente: filtros.clasePaciente || '',
					letras,
					visitas,
				}),
			}),
		);
	},

	profesionales: (id: number) =>
		dato<ProfesionalRendicion[]>(apiService.get(`/rendiciones/${id}/profesionales`, CARGA)),

	reporteProfesionalSumario: (id: number, filtros: FiltrosReporteProfesionalSumario) => {
		const matriculas =
			filtros.todosLosMedicos || !filtros.matriculas?.length ? '' : filtros.matriculas.join(',');
		return dato<ReporteProfesionalSumario>(
			apiService.get(`/rendiciones/${id}/reporte-profesional-sumario`, {
				timeout: 120000,
				params: limpio({ matriculas }),
			}),
		);
	},

	opcionesPracticaDetalle: (id: number) =>
		dato<OpcionesPracticaDetalle>(apiService.get(`/rendiciones/${id}/opciones-practica-detalle`, CARGA)),

	reportePracticaDetalle: (id: number, filtros: FiltrosReportePracticaDetalle) => {
		const tipos = (filtros.tipos?.length ? filtros.tipos : ['G', 'H', 'M']).join(',');
		return dato<ReportePracticaDetalle>(
			apiService.get(`/rendiciones/${id}/reporte-practica-detalle`, {
				timeout: 120000,
				params: limpio({
					tipos,
					practicas: filtros.practicas?.length ? filtros.practicas.join(',') : '',
					funciones: filtros.funciones?.length ? filtros.funciones.join(',') : '',
					matriculas: filtros.matriculas?.length ? filtros.matriculas.join(',') : '',
					orden: filtros.orden || 'admision',
					desglosarModulos: filtros.desglosarModulos === false ? '0' : '1',
				}),
			}),
		);
	},

	reportePracticaResumen: (id: number, filtros: FiltrosReportePracticaResumen) => {
		const tipos = (filtros.tipos?.length ? filtros.tipos : ['G', 'H', 'M']).join(',');
		return dato<ReportePracticaResumen>(
			apiService.get(`/rendiciones/${id}/reporte-practica-resumen`, {
				timeout: 120000,
				params: limpio({
					tipos,
					practicas: filtros.practicas?.length ? filtros.practicas.join(',') : '',
					desglosarModulos: filtros.desglosarModulos === false ? '0' : '1',
				}),
			}),
		);
	},

	crear: (datos: DatosCabeceraRendicion) => dato<RendicionDetalle>(apiService.post('/rendiciones', datos)),

	actualizar: (id: number, datos: Partial<DatosCabeceraRendicion>) =>
		dato<RendicionDetalle>(apiService.put(`/rendiciones/${id}`, datos)),

	eliminar: (id: number) => dato<{ id: number }>(apiService.delete(`/rendiciones/${id}`)),
};
