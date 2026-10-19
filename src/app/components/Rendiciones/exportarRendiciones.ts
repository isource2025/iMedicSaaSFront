import type { ColumnaExcel, LibroExcel } from '@/app/utils/export/libroExcel';
import type { FacturaRendicion, LineaRendida, Rendicion, RendicionDetalle, VisitaRendida } from '@/app/types/rendiciones';
import { fmtPeriodo, hoyIso } from '@/app/components/Facturacion/formato';
import { ESTADO_LABEL, VALORIZACION } from './rendicionesFormato';

const columnasImportes = <T>(imp: (f: T) => Rendicion['importes']): ColumnaExcel<T>[] => [
	{ etiqueta: 'Honorarios', valor: (f) => imp(f).honorarios, tipo: 'moneda' },
	{ etiqueta: 'Gastos', valor: (f) => imp(f).gastos, tipo: 'moneda' },
	{ etiqueta: 'Medicamentos', valor: (f) => imp(f).medicamentos, tipo: 'moneda' },
	{ etiqueta: 'Otros servicios', valor: (f) => imp(f).otros, tipo: 'moneda' },
	{ etiqueta: 'Total', valor: (f) => imp(f).total, tipo: 'moneda' },
];

function rangoPeriodos(filas: { periodo: string | null }[]) {
	const ps = filas.map((f) => f.periodo).filter((p): p is string => Boolean(p)).sort();
	const hoy = hoyIso();
	return { inicio: ps[0] || hoy, fin: ps[ps.length - 1] || hoy };
}

export function libroDeListado(filas: Rendicion[], filtros: [string, string][]): LibroExcel {
	const columnas: ColumnaExcel<Rendicion>[] = [
		{ etiqueta: 'N°', valor: (f) => f.id, tipo: 'entero' },
		{ etiqueta: 'Fecha', valor: (f) => (f.fechaGraba ? f.fechaGraba.slice(0, 10) : null), tipo: 'fecha' },
		{ etiqueta: 'Tipo', valor: (f) => f.tipoCliente.descripcion },
		{ etiqueta: 'Cliente', valor: (f) => f.cliente.razonSocial || '' },
		{ etiqueta: 'Código cliente', valor: (f) => f.cliente.valor, tipo: 'entero' },
		{ etiqueta: 'Convenio', valor: (f) => f.convenio.codigo, tipo: 'entero' },
		{ etiqueta: 'Descripción convenio', valor: (f) => f.convenio.descripcion || '' },
		{ etiqueta: 'Observaciones', valor: (f) => f.observaciones },
		{ etiqueta: 'Período', valor: (f) => fmtPeriodo(f.periodo) },
		...columnasImportes<Rendicion>((f) => f.importes),
		{ etiqueta: 'Visitas', valor: (f) => f.visitas, tipo: 'entero' },
		{ etiqueta: 'Estado', valor: (f) => ESTADO_LABEL[f.estado] },
	];
	return {
		titulo: 'Rendiciones',
		archivo: 'rendiciones',
		periodo: rangoPeriodos(filas),
		detalles: [['Rendiciones', filas.length], ...filtros],
		hojas: [{ nombre: 'Rendiciones', columnas, filas }],
	};
}

export function libroDeRendicion(
	r: RendicionDetalle,
	visitas: VisitaRendida[],
	lineas: LineaRendida[],
	facturas: FacturaRendicion[],
): LibroExcel {
	const colVisitas: ColumnaExcel<VisitaRendida>[] = [
		{ etiqueta: 'N° Adm.', valor: (v) => v.numeroVisita, tipo: 'entero' },
		{ etiqueta: 'Paciente', valor: (v) => v.paciente.nombre || '' },
		{ etiqueta: 'Documento', valor: (v) => (v.paciente.documento ? `${v.paciente.documento.tipo} ${v.paciente.documento.numero}`.trim() : '') },
		{ etiqueta: 'Clase', valor: (v) => v.clase?.descripcion || '' },
		{ etiqueta: 'Ingreso', valor: (v) => v.ingreso, tipo: 'fecha' },
		{ etiqueta: 'Egreso', valor: (v) => v.egreso, tipo: 'fecha' },
		{ etiqueta: 'Primera práctica', valor: (v) => v.desde, tipo: 'fecha' },
		{ etiqueta: 'Última práctica', valor: (v) => v.hasta, tipo: 'fecha' },
		...columnasImportes<VisitaRendida>((v) => v.importes),
		{ etiqueta: 'Prestaciones', valor: (v) => v.lineas, tipo: 'entero' },
		{ etiqueta: 'Sin valor', valor: (v) => v.sinValor, tipo: 'entero' },
	];
	const colLineas: ColumnaExcel<LineaRendida>[] = [
		{ etiqueta: 'Fecha', valor: (l) => l.fecha, tipo: 'fecha' },
		{ etiqueta: 'Visita', valor: (l) => l.numeroVisita, tipo: 'entero' },
		{ etiqueta: 'Paciente', valor: (l) => l.paciente || '' },
		{ etiqueta: 'Tipo', valor: (l) => l.tipo.descripcion },
		{ etiqueta: 'Módulo', valor: (l) => l.modulo.descripcion },
		{ etiqueta: 'L', valor: (l) => l.practica.tipo || '' },
		{ etiqueta: 'Práctica', valor: (l) => l.practica.codigo, tipo: 'entero' },
		{ etiqueta: 'Descripción', valor: (l) => l.practica.descripcion || '' },
		{ etiqueta: 'Matrícula', valor: (l) => l.profesional?.matricula ?? null, tipo: 'entero' },
		{ etiqueta: 'Profesional', valor: (l) => l.profesional?.nombre || '' },
		{ etiqueta: 'Función', valor: (l) => l.funcion?.descripcion || '' },
		{ etiqueta: 'Cantidad', valor: (l) => l.cantidad, tipo: 'decimal' },
		{ etiqueta: '%', valor: (l) => l.porcentaje, tipo: 'decimal' },
		{ etiqueta: 'Unitario', valor: (l) => l.importeUnitario, tipo: 'moneda' },
		{ etiqueta: 'Importe', valor: (l) => l.importeFinal, tipo: 'moneda' },
		{ etiqueta: 'Regla del convenio', valor: (l) => (l.regla ? `${l.regla.tipoValor || 'calc.'} ${l.regla.valor}` : '') },
		{ etiqueta: 'Valorización', valor: (l) => VALORIZACION[l.valorizacion.estado].label + (l.valorizacion.manual ? ' (manual)' : '') },
	];
	const colFacturas: ColumnaExcel<FacturaRendicion>[] = [
		{ etiqueta: 'Comprobante', valor: (f) => `${f.comprobante} ${f.letra}`.trim() },
		{ etiqueta: 'Número', valor: (f) => f.numero, tipo: 'entero' },
		{ etiqueta: 'Fecha', valor: (f) => f.fechaGraba, tipo: 'fecha' },
		{ etiqueta: 'Neto', valor: (f) => f.neto, tipo: 'moneda' },
		{ etiqueta: 'IVA', valor: (f) => f.iva, tipo: 'moneda' },
		{ etiqueta: 'Total', valor: (f) => f.total, tipo: 'moneda' },
		{ etiqueta: 'Saldo', valor: (f) => f.saldo, tipo: 'moneda' },
	];
	const p = r.periodo || hoyIso();
	return {
		titulo: `Rendición #${r.id} · ${r.cliente.razonSocial || r.cliente.valor}`,
		archivo: `rendicion_${r.id}`,
		periodo: { inicio: p, fin: p },
		detalles: [
			['Cliente', `${r.cliente.razonSocial || ''} (${r.cliente.valor})`],
			['Convenio', `#${r.convenio.codigo} ${r.convenio.descripcion || ''}`],
			['Período', fmtPeriodo(r.periodo)],
			['Estado', ESTADO_LABEL[r.estado]],
			['Observaciones', r.observaciones],
			['Honorarios', r.importes.honorarios],
			['Gastos', r.importes.gastos],
			['Medicamentos', r.importes.medicamentos],
			['Otros servicios', r.importes.otros],
			['Total', r.importes.total],
			['Visitas', r.visitas],
		],
		notas: [
			'"Valorización" compara el importe de cada prestación con la regla que el convenio tiene HOY: "Difiere" no es necesariamente un error.',
		],
		hojas: [
			{ nombre: 'Visitas', columnas: colVisitas, filas: visitas },
			{ nombre: 'Prestaciones', columnas: colLineas, filas: lineas },
			{ nombre: 'Facturas', columnas: colFacturas, filas: facturas },
		],
	};
}
