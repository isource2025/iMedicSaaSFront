// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { PestanaDef } from '@/app/types/convenios';
import {
	alternarBaja,
	agregarAltas,
	cantidadCambios,
	construirLote,
	editarAlta,
	editarCelda,
	erroresDelLote,
	filaNueva,
	mismoValor,
	quitarAlta,
	sinCambios,
	valorVisible,
} from './grillaConvenio';

const pestana: PestanaDef = {
	id: 'nomenclador',
	titulo: 'Nomenclador',
	paginada: true,
	filtroFuncion: true,
	catalogo: 'imNomenclador',
	ajustables: ['Valor'],
	ajusteSoloFijos: true,
	columnas: [
		{ name: 'Desde', label: 'Desde', kind: 'practica', sqlType: 'Int', required: true, min: 0 },
		{ name: 'Hasta', label: 'Hasta', kind: 'practica', sqlType: 'Int', required: true, min: 0 },
		{ name: 'Descripcion', label: 'Descripción', kind: 'texto', sqlType: 'VarChar', length: 255, required: false },
		{ name: 'TipoValor', label: 'Tipo', kind: 'tipoValor', sqlType: 'Char', length: 1, required: false, defecto: '$' },
		{ name: 'Valor', label: 'Valor', kind: 'importe', sqlType: 'Money', required: false, min: 0 },
	],
};

const fila = { _id: '10', Desde: 420101, Hasta: 420101, Descripcion: 'CONSULTA', TipoValor: '$', Valor: 100 };
const col = (n: string) => pestana.columnas.find((c) => c.name === n)!;

describe('grillaConvenio', () => {
	it('compara números escritos con coma y vacíos', () => {
		expect(mismoValor(col('Valor'), '100,0', 100)).toBe(true);
		expect(mismoValor(col('Valor'), '', null)).toBe(true);
		expect(mismoValor(col('Valor'), '0', null)).toBe(false);
		expect(mismoValor(col('Descripcion'), ' CONSULTA ', 'CONSULTA')).toBe(true);
	});

	it('una edición que vuelve al valor original deja de contar', () => {
		let c = editarCelda(sinCambios(), pestana, fila, 'Valor', '150');
		expect(cantidadCambios(c)).toBe(1);
		expect(valorVisible(c, fila, col('Valor'))).toBe('150');
		c = editarCelda(c, pestana, fila, 'Valor', '100');
		expect(cantidadCambios(c)).toBe(0);
		expect(c.editadas).toEqual({});
	});

	it('el lote manda la fila completa, sin las editadas que también se borran', () => {
		let c = editarCelda(sinCambios(), pestana, fila, 'Valor', '150');
		const otra = { ...fila, _id: '11', Desde: 1 , Hasta: 1};
		c = editarCelda(c, pestana, otra, 'Descripcion', 'X');
		c = alternarBaja(c, '11');
		const nueva = filaNueva(pestana, { Desde: 5, Hasta: 5 });
		c = agregarAltas(c, [nueva]);
		c = editarAlta(c, nueva._tmp, { Valor: '9' });

		const lote = construirLote(pestana, c);
		expect(lote.cambios).toEqual([{ _id: '10', Desde: 420101, Hasta: 420101, Descripcion: 'CONSULTA', TipoValor: '$', Valor: '150' }]);
		expect(lote.bajas).toEqual(['11']);
		expect(lote.altas).toEqual([{ Desde: 5, Hasta: 5, Descripcion: null, TipoValor: '$', Valor: '9' }]);
		expect(cantidadCambios(c)).toBe(3);

		c = alternarBaja(quitarAlta(c, nueva._tmp), '11');
		expect(cantidadCambios(c)).toBe(2);
	});

	it('valida obligatorios, números y rango antes de mandar', () => {
		let c = agregarAltas(sinCambios(), [filaNueva(pestana, { Desde: 9, Hasta: 3, Valor: 'abc' })]);
		c = editarCelda(c, pestana, fila, 'Desde', '');
		const errores = erroresDelLote(pestana, c);
		expect(errores).toContain('Fila nueva 1: Valor: Tiene que ser un número');
		expect(errores).toContain('Fila nueva 1: "Desde" no puede ser mayor que "Hasta"');
		expect(errores).toContain('Fila modificada 1: Desde: Obligatorio');
	});
});
