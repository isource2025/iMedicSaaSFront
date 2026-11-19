import { describe, expect, it } from 'vitest';
import { buildHCIPhysicalExamSections } from './hciIngresoDisplay';

const seccion = (record: Record<string, unknown>, titulo: string) =>
	buildHCIPhysicalExamSections(record).find((s) => s.titulo === titulo)?.campos;

describe('buildHCIPhysicalExamSections', () => {
	it('agrupa en el examen oftalmológico las columnas EO_ de oftalmología, TONO incluido', () => {
		const record = { EO_TONO: '18', EO_BIOMOSCROPIA: 'si' };
		expect(seccion(record, 'EXAMEN OFTALMOLÓGICO')).toEqual([
			{ label: 'Tono', valor: '18' },
			{ label: 'Biomoscropia', valor: 'si' },
		]);
		expect(seccion(record, 'EXAMEN OBSTÉTRICO')).toBeUndefined();
	});

	it('deja TONO en el examen obstétrico cuando la HC es obstétrica', () => {
		const record = { EO_AU: '32', EO_LCF: '140', EO_TONO: 'normal' };
		expect(seccion(record, 'EXAMEN OBSTÉTRICO')?.map((c) => c.label)).toEqual(['Au', 'Lcf', 'Tono']);
		expect(seccion(record, 'EXAMEN OFTALMOLÓGICO')).toBeUndefined();
	});

	it('omite los vacíos de Clarion y muestra el resto de cualquier sección', () => {
		const record = {
			MI_ULCERAS: 0,
			MP_TUMOR: false,
			C_OJOS: '   ',
			EO_TONO: '',
			eo_refraccion: ' -1.25 ',
			XX_CAMPONUEVO: true,
			AR_TEXTO: ['', 'roncus', 'roncus'],
		};
		expect(buildHCIPhysicalExamSections(record)).toEqual([
			{ titulo: 'EXAMEN OFTALMOLÓGICO', campos: [{ label: 'Refraccion', valor: '-1.25' }] },
			{ titulo: 'OTROS DATOS DE LA HC', campos: [{ label: 'Camponuevo', valor: 'Sí' }] },
			{ titulo: 'APARATO RESPIRATORIO', campos: [{ label: 'Texto', valor: 'roncus' }] },
		]);
	});

	it('no repite pares craneanos por el alias del back', () => {
		const campos = seccion({ 'SN _PARESCRANEANOS': 'ok', SN_PARESCRANEANOS: 'ok' }, 'SISTEMA NERVIOSO');
		expect(campos).toHaveLength(1);
		expect(seccion({ 'SN _PARESCRANEANOS': 'ok' }, 'OTROS DATOS DE LA HC')).toBeUndefined();
	});
});
