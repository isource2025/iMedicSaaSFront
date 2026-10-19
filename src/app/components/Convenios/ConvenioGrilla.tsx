'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Plus, RefreshCw, RotateCcw, Save, Search, Trash2, X } from 'lucide-react';
import ConfirmDialog from '@/app/components/Agenda/ConfirmDialog';
import Pagination from '@/app/components/UI/Pagination';
import { useToast } from '@/app/components/UI/ToastProvider';
import { conveniosService, detallesDeError } from '@/app/services/conveniosService';
import { mensajeDeError } from '@/app/utils/apiError';
import type {
	CatalogosConvenio,
	ColumnaDef,
	FilaDetalle,
	PaginaPestana,
	PestanaDef,
	ResultadoCatalogo,
	ValorCelda,
} from '@/app/types/convenios';
import CatalogoPickerModal, { type TipoCatalogo } from './CatalogoPickerModal';
import {
	agregarAltas,
	alternarBaja,
	cantidadCambios,
	columnasVisibles,
	construirLote,
	editarAlta,
	editarCelda,
	errorCelda,
	erroresDelLote,
	filaNueva,
	quitarAlta,
	sinCambios,
	textoImporte,
	valorDeFila,
	valorVisible,
	type CambiosGrilla,
	type FilaNueva,
} from './grillaConvenio';
import s from '@/app/components/admission/visitDetail/VisitDetail.module.css';
import c from '@/app/components/Facturacion/Facturacion.module.css';

const TAM_PAGINA = 100;

interface Props {
	codigo: number;
	pestana: PestanaDef;
	catalogos: CatalogosConvenio;
	puedeEditar: boolean;
	onPendientes: (n: number) => void;
	onGuardado: () => void;
}

type AccionPendiente = { tipo: 'pagina'; pagina: number } | { tipo: 'q'; q: string } | { tipo: 'funcion'; funcion: number | '' } | { tipo: 'recargar' };

const TIPOS_VALOR = [
	{ value: '$', label: 'Fijo' },
	{ value: '%', label: 'Porcentaje' },
	{ value: '', label: 'Calculado' },
];

function claseColumna(col: ColumnaDef): string {
	if (col.kind === 'flag') return c.colFlag;
	if (col.kind === 'complejidad') return c.colCorta;
	if (col.kind === 'tipoValor') return c.colTipo;
	if (col.kind === 'letra' || col.kind === 'funcion') return c.colSelect;
	if (col.name === 'Descripcion') return c.colDescripcion;
	return c.colNum;
}

/** Columnas de la grilla: Desde y Hasta van juntas en "Rango de prácticas". */
type ColumnaGrilla = { tipo: 'col'; col: ColumnaDef } | { tipo: 'rango'; desde: ColumnaDef; hasta: ColumnaDef };

function columnasGrilla(pestana: PestanaDef): ColumnaGrilla[] {
	const cols = columnasVisibles(pestana);
	const desde = cols.find((x) => x.name === 'Desde');
	const hasta = cols.find((x) => x.name === 'Hasta');
	const out: ColumnaGrilla[] = [];
	for (const col of cols) {
		if (desde && hasta && col === desde) out.push({ tipo: 'rango', desde, hasta });
		else if (!(desde && hasta && col === hasta)) out.push({ tipo: 'col', col });
	}
	return out;
}

const claveGrilla = (g: ColumnaGrilla) => (g.tipo === 'rango' ? 'rango' : g.col.name);

function Editor({
	col,
	valor,
	catalogos,
	disabled,
	editada,
	onCambio,
}: {
	col: ColumnaDef;
	valor: ValorCelda;
	catalogos: CatalogosConvenio;
	disabled: boolean;
	editada: boolean;
	onCambio: (v: ValorCelda) => void;
}) {
	const error = errorCelda(col, valor);
	const cls = `${editada ? c.celdaEditada : ''} ${error ? c.celdaError : ''}`;
	const comun = { disabled, title: error || undefined, 'aria-label': col.label, 'aria-invalid': Boolean(error) || undefined };

	if (col.kind === 'flag') {
		return (
			<input
				type='checkbox'
				checked={Number(valor) === 1}
				onChange={(e) => onCambio(e.target.checked ? 1 : 0)}
				className={editada ? c.celdaEditada : ''}
				{...comun}
			/>
		);
	}
	const select = (opciones: { value: string | number; label: string }[]) => {
		const actual = valor === null || valor === undefined ? '' : String(valor).trim();
		const lista = opciones.some((o) => String(o.value) === actual) ? opciones : [...opciones, { value: actual, label: actual || '—' }];
		const etiqueta = lista.find((o) => String(o.value) === actual)?.label;
		return (
			<select
				className={`${c.celdaSelect} ${cls}`}
				value={actual}
				onChange={(e) => onCambio(e.target.value)}
				{...comun}
				title={error || etiqueta}
			>
				{lista.map((o) => (
					<option key={String(o.value)} value={String(o.value)}>
						{o.label}
					</option>
				))}
			</select>
		);
	};
	if (col.kind === 'tipoValor') return select(TIPOS_VALOR);
	if (col.kind === 'letra') return select(catalogos.letras.map((l) => ({ value: l.valor, label: l.descripcion || l.valor })));
	if (col.kind === 'funcion') return select(catalogos.funciones.map((f) => ({ value: f.valor, label: f.descripcion })));
	if (col.kind === 'complejidad') return select(catalogos.complejidades.map((n) => ({ value: n, label: String(n) })));

	const esTexto = col.sqlType === 'VarChar' || col.sqlType === 'Char';
	const esImporte = col.kind === 'importe';
	const texto = valor === null || valor === undefined ? '' : esImporte && typeof valor === 'number' ? textoImporte(valor) : String(valor);
	return (
		<input
			className={`${esTexto ? c.celdaTexto : c.celda} ${cls}`}
			value={texto}
			maxLength={esTexto ? col.length : undefined}
			inputMode={esTexto ? undefined : 'decimal'}
			onChange={(e) => onCambio(e.target.value)}
			onBlur={esImporte && typeof valor === 'string' && !error ? () => onCambio(textoImporte(valor)) : undefined}
			{...comun}
		/>
	);
}

export default function ConvenioGrilla({ codigo, pestana, catalogos, puedeEditar, onPendientes, onGuardado }: Props) {
	const toast = useToast();
	const [pagina, setPagina] = useState(1);
	const [q, setQ] = useState('');
	const [qAplicada, setQAplicada] = useState('');
	const [funcion, setFuncion] = useState<number | ''>('');
	const [datos, setDatos] = useState<PaginaPestana | null>(null);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [cambios, setCambios] = useState<CambiosGrilla>(sinCambios);
	const [guardando, setGuardando] = useState(false);
	const [problemas, setProblemas] = useState<{ mensaje: string; detalles: string[]; conflicto: boolean } | null>(null);
	const [pendiente, setPendiente] = useState<AccionPendiente | null>(null);
	const [picker, setPicker] = useState(false);
	const [recarga, setRecarga] = useState(0);

	const nCambios = cantidadCambios(cambios);
	useEffect(() => onPendientes(nCambios), [nCambios, onPendientes]);

	useEffect(() => {
		let vigente = true;
		setCargando(true);
		setError(null);
		conveniosService
			.pestana(codigo, pestana.id, pestana.paginada ? { pagina, tamPagina: TAM_PAGINA, q: qAplicada || undefined, funcion } : {})
			.then((r) => vigente && setDatos(r))
			.catch((e) => vigente && setError(mensajeDeError(e, 'No se pudo cargar el detalle')))
			.finally(() => vigente && setCargando(false));
		return () => {
			vigente = false;
		};
	}, [codigo, pestana, pagina, qAplicada, funcion, recarga]);

	const ejecutar = useCallback((a: AccionPendiente) => {
		setCambios(sinCambios());
		setProblemas(null);
		if (a.tipo === 'pagina') setPagina(a.pagina);
		if (a.tipo === 'q') {
			setPagina(1);
			setQAplicada(a.q);
		}
		if (a.tipo === 'funcion') {
			setPagina(1);
			setFuncion(a.funcion);
		}
		if (a.tipo === 'recargar') setRecarga((n) => n + 1);
	}, []);

	/** Cambiar de página o filtro descarta lo no guardado: se pide confirmación. */
	const pedir = (a: AccionPendiente) => (nCambios > 0 ? setPendiente(a) : ejecutar(a));

	useEffect(() => {
		if (!pestana.paginada) return;
		const t = setTimeout(() => {
			if (q.trim() !== qAplicada) pedir({ tipo: 'q', q: q.trim() });
		}, 400);
		return () => clearTimeout(t);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [q]);

	const filas = datos?.filas ?? [];
	const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / (datos.tamPagina || TAM_PAGINA))) : 1;
	const tipoCatalogo: TipoCatalogo | null =
		pestana.id === 'nomenclador' || pestana.id === 'moduladas' || pestana.id === 'vademecum' ? pestana.id : null;

	const agregarVacia = () => setCambios((prev) => agregarAltas(prev, [filaNueva(pestana)]));

	const agregarDesdeCatalogo = (r: ResultadoCatalogo) => {
		const inicial: Record<string, ValorCelda> =
			pestana.id === 'vademecum'
				? { Troquel: r.codigo, Descripcion: r.descripcion.slice(0, 80) }
				: { Desde: r.codigo, Hasta: r.codigo, Descripcion: r.descripcion.slice(0, 255) };
		setCambios((prev) => agregarAltas(prev, [filaNueva(pestana, inicial)]));
	};

	const guardar = async () => {
		const locales = erroresDelLote(pestana, cambios);
		if (locales.length) {
			setProblemas({ mensaje: 'Hay datos para corregir antes de guardar', detalles: locales.slice(0, 20), conflicto: false });
			return;
		}
		setGuardando(true);
		setProblemas(null);
		try {
			const r = await conveniosService.guardarLote(codigo, pestana.id, construirLote(pestana, cambios));
			const partes = [
				r.altas && `${r.altas} agregada${r.altas === 1 ? '' : 's'}`,
				r.cambios && `${r.cambios} modificada${r.cambios === 1 ? '' : 's'}`,
				r.bajas && `${r.bajas} borrada${r.bajas === 1 ? '' : 's'}`,
			].filter(Boolean);
			toast.success(`${pestana.titulo}: ${partes.join(', ')}.`);
			setCambios(sinCambios());
			setRecarga((n) => n + 1);
			onGuardado();
		} catch (e) {
			const status = Number((e as { response?: { status?: number } })?.response?.status);
			setProblemas({
				mensaje: mensajeDeError(e, 'No se pudieron guardar los cambios'),
				detalles: detallesDeError(e),
				conflicto: status === 409,
			});
		} finally {
			setGuardando(false);
		}
	};

	const chips = useMemo(() => {
		if (!pestana.filtroFuncion || !datos?.porFuncion) return [];
		return datos.porFuncion.map((p) => ({
			valor: p.funcion,
			cantidad: p.cantidad,
			label: catalogos.funciones.find((f) => f.valor === p.funcion)?.descripcion || `Función ${p.funcion ?? '—'}`,
		}));
	}, [datos, pestana, catalogos]);
	const totalSinFiltro = chips.reduce((a, x) => a + x.cantidad, 0);

	const grilla = useMemo(() => columnasGrilla(pestana), [pestana]);

	const celdas = (
		valores: (col: ColumnaDef) => ValorCelda,
		editada: (col: ColumnaDef) => boolean,
		alCambiar: (col: ColumnaDef, v: ValorCelda) => void,
		deshabilitada: boolean,
		bajoDescripcion?: ReactNode,
	) => {
		const editor = (col: ColumnaDef) => (
			<Editor
				col={col}
				valor={valores(col)}
				catalogos={catalogos}
				disabled={!puedeEditar || deshabilitada}
				editada={editada(col)}
				onCambio={(v) => alCambiar(col, v)}
			/>
		);
		return grilla.map((g) =>
			g.tipo === 'rango' ? (
				<td key='rango' className={c.colRango}>
					<div className={c.rango}>
						{editor(g.desde)}
						<span className={c.rangoSep} aria-hidden>
							–
						</span>
						{editor(g.hasta)}
					</div>
				</td>
			) : (
				<td key={g.col.name} className={claseColumna(g.col)}>
					{editor(g.col)}
					{g.col.name === 'Descripcion' ? bajoDescripcion : null}
				</td>
			),
		);
	};

	const pistaCatalogo = (f: FilaDetalle) => {
		const cat = f._catalogo;
		if (!cat) return null;
		if (!cat.existe) {
			return <span className={`${c.catalogoHint} ${c.catalogoFalta}`}>No está en el {pestana.id === 'vademecum' ? 'vademécum' : 'catálogo de prácticas'}</span>;
		}
		const colDesc = pestana.columnas.find((x) => x.name === 'Descripcion');
		const desc = colDesc ? String(valorDeFila(f, colDesc) || '').trim() : '';
		return cat.descripcion && cat.descripcion !== desc ? <span className={c.catalogoHint} title={cat.descripcion}>{cat.descripcion}</span> : null;
	};

	const renderAlta = (a: FilaNueva) => (
		<tr key={a._tmp} className={c.filaNueva}>
			{celdas(
				(col) => a.valores[col.name] ?? null,
				() => false,
				(col, v) => setCambios((p) => editarAlta(p, a._tmp, { [col.name]: v })),
				false,
			)}
			<td className={c.colAccion}>
				<button type='button' className={c.iconBtn} onClick={() => setCambios((p) => quitarAlta(p, a._tmp))} title='Quitar fila nueva' aria-label='Quitar fila nueva'>
					<X size={15} />
				</button>
			</td>
		</tr>
	);

	const renderFila = (f: FilaDetalle) => {
		const baja = cambios.bajas.includes(f._id);
		const ed = cambios.editadas[f._id];
		return (
			<tr key={f._id} className={baja ? c.filaBaja : ''}>
				{celdas(
					(col) => valorVisible(cambios, f, col),
					(col) => Boolean(ed && col.name in ed.valores),
					(col, v) => setCambios((p) => editarCelda(p, pestana, f, col.name, v)),
					baja,
					pistaCatalogo(f),
				)}
				{puedeEditar ? (
					<td className={c.colAccion}>
						<button
							type='button'
							className={`${c.iconBtn} ${baja ? c.iconBtnRestaurar : ''}`}
							onClick={() => setCambios((p) => alternarBaja(p, f._id))}
							title={baja ? 'Restaurar fila' : 'Borrar fila'}
							aria-label={baja ? 'Restaurar fila' : 'Borrar fila'}
						>
							{baja ? <RotateCcw size={15} /> : <Trash2 size={15} />}
						</button>
					</td>
				) : null}
			</tr>
		);
	};

	const mensajePendiente =
		pendiente?.tipo === 'recargar'
			? `Tenés ${nCambios} cambio${nCambios === 1 ? '' : 's'} sin guardar. Si recargás se pierden.`
			: `Tenés ${nCambios} cambio${nCambios === 1 ? '' : 's'} sin guardar en esta página. Si seguís se pierden.`;

	return (
		<div>
			{pestana.paginada ? (
				<div className={s.toolbar}>
					<label className={s.search}>
						<Search size={15} aria-hidden />
						<input
							type='search'
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder={
								pestana.id === 'vademecum'
									? 'Buscar por troquel o nombre…'
									: pestana.id === 'genericos'
									  ? 'Buscar por descripción…'
									  : 'Buscar por código de práctica o descripción…'
							}
							aria-label={`Buscar en ${pestana.titulo}`}
						/>
						{q ? (
							<button type='button' className={s.searchClear} onClick={() => setQ('')} aria-label='Limpiar búsqueda'>
								<X size={14} />
							</button>
						) : null}
					</label>
					{chips.length > 1 ? (
						<div className={s.chips} role='group' aria-label='Función'>
							<button type='button' className={`${s.chip} ${funcion === '' ? s.chipActive : ''}`} onClick={() => pedir({ tipo: 'funcion', funcion: '' })}>
								Todas <span className={s.chipCount}>{totalSinFiltro}</span>
							</button>
							{chips.map((ch) => (
								<button
									key={String(ch.valor)}
									type='button'
									className={`${s.chip} ${funcion === ch.valor ? s.chipActive : ''}`}
									onClick={() => ch.valor !== null && pedir({ tipo: 'funcion', funcion: ch.valor })}
									title={ch.label}
								>
									{ch.label} <span className={s.chipCount}>{ch.cantidad}</span>
								</button>
							))}
						</div>
					) : null}
				</div>
			) : null}

			<div className={c.accionesGrilla}>
				{puedeEditar ? (
					<>
						{tipoCatalogo ? (
							<button type='button' className={s.primaryBtn} onClick={() => setPicker(true)}>
								<Plus size={15} aria-hidden />
								{tipoCatalogo === 'vademecum' ? 'Agregar medicamento' : 'Agregar práctica'}
							</button>
						) : null}
						<button type='button' className={tipoCatalogo ? s.ghostBtn : s.primaryBtn} onClick={agregarVacia}>
							<Plus size={15} aria-hidden />
							{tipoCatalogo ? 'Fila vacía' : pestana.id === 'genericos' ? 'Agregar genérico' : 'Agregar fila'}
						</button>
					</>
				) : null}
				<button type='button' className={s.ghostBtn} onClick={() => pedir({ tipo: 'recargar' })} disabled={cargando}>
					<RefreshCw size={15} aria-hidden />
					Recargar
				</button>
				{puedeEditar ? (
					<div className={c.accionesDerecha}>
						{nCambios ? <span className={c.pendientes}>{nCambios} sin guardar</span> : null}
						<button type='button' className={s.ghostBtn} onClick={() => ejecutar({ tipo: 'recargar' })} disabled={!nCambios || guardando}>
							Descartar
						</button>
						<button type='button' className={c.btnPrimary} onClick={guardar} disabled={!nCambios || guardando}>
							<Save size={15} aria-hidden />
							{guardando ? 'Guardando…' : 'Guardar cambios'}
						</button>
					</div>
				) : null}
			</div>

			{problemas ? (
				<div className={c.error} role='alert' style={{ marginBottom: 12 }}>
					<strong>{problemas.mensaje}</strong>
					{problemas.detalles.length ? (
						<ul className={c.errorList}>
							{problemas.detalles.map((d) => (
								<li key={d}>{d}</li>
							))}
						</ul>
					) : null}
					{problemas.conflicto ? (
						<div style={{ marginTop: 8 }}>
							<button type='button' className={s.linkBtn} onClick={() => ejecutar({ tipo: 'recargar' })}>
								Descartar mis cambios y recargar
							</button>
						</div>
					) : null}
				</div>
			) : null}

			{error ? <p className={c.error}>{error}</p> : null}

			{cargando && !datos ? (
				<div className={s.stateBox} role='status'>
					<span className={s.spinner} aria-hidden />
					<span>Cargando {pestana.titulo.toLowerCase()}…</span>
				</div>
			) : filas.length === 0 && cambios.altas.length === 0 ? (
				<p className={s.empty}>
					{qAplicada || funcion !== '' ? 'Ninguna fila coincide con el filtro.' : 'Este convenio no tiene filas en esta pestaña.'}
				</p>
			) : (
				<div className={c.grillaWrap} style={{ opacity: cargando ? 0.6 : 1 }}>
					<table className={c.grilla}>
						<thead>
							<tr>
								{grilla.map((g) =>
									g.tipo === 'rango' ? (
										<th key='rango' className={c.colRango}>
											Rango de prácticas
										</th>
									) : (
										<th key={g.col.name} className={claseColumna(g.col)} title={g.col.label}>
											{g.col.label}
										</th>
									),
								)}
								{puedeEditar ? <th className={c.colAccion} aria-label='Acciones' /> : null}
							</tr>
						</thead>
						<tbody>
							{cambios.altas.map(renderAlta)}
							{filas.map(renderFila)}
						</tbody>
					</table>
				</div>
			)}

			{pestana.paginada && datos && datos.total > 0 ? (
				<div className={c.paginacion} style={{ marginTop: 10 }}>
					<span>
						{datos.total.toLocaleString('es-AR')} fila{datos.total === 1 ? '' : 's'}
						{totalPaginas > 1 ? ` · página ${pagina} de ${totalPaginas}` : ''}
					</span>
					<Pagination currentPage={pagina} totalPages={totalPaginas} onPageChange={(p) => pedir({ tipo: 'pagina', pagina: p })} />
				</div>
			) : null}

			{tipoCatalogo ? (
				<CatalogoPickerModal open={picker} tipo={tipoCatalogo} onClose={() => setPicker(false)} onElegir={agregarDesdeCatalogo} />
			) : null}

			<ConfirmDialog
				open={Boolean(pendiente)}
				title='Descartar cambios'
				message={mensajePendiente}
				confirmLabel='Descartar y seguir'
				tone='danger'
				onCancel={() => setPendiente(null)}
				onConfirm={() => {
					const a = pendiente;
					setPendiente(null);
					if (a) ejecutar(a);
				}}
			/>
		</div>
	);
}
