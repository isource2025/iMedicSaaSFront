import { fmtFecha, hoyIso } from '@/app/components/Facturacion/formato';
import type { CabeceraConvenio, EstadoVigencia, PestanaId } from '@/app/types/convenios';

export const ESTADO_LABEL: Record<EstadoVigencia, string> = {
	vigente: 'Vigente',
	futuro: 'Futuro',
	vencido: 'Vencido',
	sin_vigencia: 'Sin vigencia',
};

export const PESTANA_CORTA: Record<PestanaId, string> = {
	valores: 'Valores',
	nomenclador: 'Nomenc.',
	moduladas: 'Modul.',
	vademecum: 'Vadem.',
	genericos: 'Genér.',
	categorias: 'Categ.',
	complejidad: 'Anest.',
};

export function vigenciaTexto(desde: string | null, hasta: string | null): string {
	if (!desde) return 'Sin vigencia cargada';
	return hasta ? `${fmtFecha(desde)} al ${fmtFecha(hasta)}` : `Desde ${fmtFecha(desde)}`;
}

export function cabeceraVacia(): CabeceraConvenio {
	return {
		Valor: 0,
		Descripcion: '',
		VigenciaDesde: hoyIso(),
		VigenciaHasta: null,
		TipoValor: 0,
		CatProfesional: 0,
		CoberturaHonorarios: 0,
		CoberturaGastos: 0,
		CoberturaMedicamentos: 0,
		CoberturaDescartables: 0,
		PrecioMedicamentos: 0,
		AplicaPrecioMed: '',
		MedicamTotal: 0,
		MedicamSobre: '',
		DescartTotal: 0,
		DescartSobre: '',
		MultiConvenio: 0,
	};
}

/** Texto pendiente de confirmar con facturación (ver docs/FACTURACION_CONVENIOS.md). */
export const A_CONFIRMAR = 'Significado a confirmar con facturación. Se guarda tal cual lo carga el sistema de escritorio.';
