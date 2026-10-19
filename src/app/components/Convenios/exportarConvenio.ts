import type { ColumnaExcel, LibroExcel, TipoColumna } from '@/app/utils/export/libroExcel';
import type { CatalogosConvenio, ColumnaDef, ExportacionConvenio, FilaDetalle } from '@/app/types/convenios';
import { ESTADO_LABEL, vigenciaTexto } from './conveniosFormato';
import { hoyIso } from '@/app/components/Facturacion/formato';

function tipoExcel(c: ColumnaDef): TipoColumna {
	if (c.sqlType === 'VarChar' || c.sqlType === 'Char') return 'texto';
	if (c.kind === 'importe') return 'decimal';
	return 'entero';
}

/** Libro con la cabecera en "Resumen" y una hoja por pestaña con todas sus filas. */
export function libroDeConvenio(exp: ExportacionConvenio, catalogos: CatalogosConvenio): LibroExcel {
	const { convenio } = exp;
	const cab = convenio.cabecera;
	const hoy = hoyIso();
	const funcion = (n: unknown) => catalogos.funciones.find((f) => f.valor === Number(n))?.descripcion ?? '';

	const hojas = catalogos.pestanas.map((p) => {
		const columnas: ColumnaExcel<FilaDetalle>[] = [];
		for (const col of p.columnas) {
			if (col.oculta) continue;
			if (col.kind === 'flag') {
				columnas.push({ etiqueta: col.label, valor: (f) => (Number(f[col.name]) === 1 ? 'Sí' : 'No') });
				continue;
			}
			columnas.push({ etiqueta: col.label, valor: (f) => f[col.name] as string | number | null, tipo: tipoExcel(col) });
			if (col.kind === 'funcion') columnas.push({ etiqueta: 'Función (descripción)', valor: (f) => funcion(f[col.name]) });
		}
		if (p.catalogo) {
			columnas.push(
				{ etiqueta: 'En catálogo', valor: (f) => (f._catalogo?.existe ? 'Sí' : 'No') },
				{ etiqueta: 'Descripción en catálogo', valor: (f) => f._catalogo?.descripcion ?? '' },
			);
		}
		return { nombre: p.titulo.slice(0, 31), columnas, filas: exp.pestanas[p.id] ?? [] };
	});

	return {
		titulo: `Convenio #${convenio.codigo} · ${convenio.descripcion}`,
		archivo: `convenio_${convenio.codigo}`,
		periodo: { inicio: convenio.vigenciaDesde || hoy, fin: convenio.vigenciaHasta || hoy },
		detalles: [
			['Obra social', `${convenio.obraSocial.razonSocial || 'Convenio general'} (${convenio.obraSocial.valor})`],
			['Vigencia', vigenciaTexto(convenio.vigenciaDesde, convenio.vigenciaHasta)],
			['Estado', ESTADO_LABEL[convenio.estado]],
			['Multiconvenio', cab.MultiConvenio ? 'Sí' : 'No'],
			['Categoría profesional', cab.CatProfesional ?? 0],
			['Tipo de valor', cab.TipoValor ?? 0],
			['Cobertura honorarios', cab.CoberturaHonorarios],
			['Cobertura gastos', cab.CoberturaGastos],
			['Cobertura medicamentos', cab.CoberturaMedicamentos],
			['Cobertura descartables', cab.CoberturaDescartables],
			['Precio medicamentos', cab.PrecioMedicamentos],
			['Aplica precio medicamentos', cab.AplicaPrecioMed || ''],
			['Medicamentos total', cab.MedicamTotal],
			['Medicamentos sobre', cab.MedicamSobre || ''],
			['Descartables total', cab.DescartTotal],
			['Descartables sobre', cab.DescartSobre || ''],
		],
		notas: [
			'Si el convenio no tiene vigencia cargada, el período del archivo es la fecha de exportación.',
			'"En catálogo = No" indica prácticas o troqueles que no existen en el nomenclador o vademécum actual.',
		],
		hojas,
	};
}
