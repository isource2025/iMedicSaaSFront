'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileDown, Plus } from 'lucide-react';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import Pagination from '@/app/components/UI/Pagination';
import { useToast } from '@/app/components/UI/ToastProvider';
import RendicionDetalleModal from '@/app/components/Rendiciones/RendicionDetalleModal';
import RendicionNuevaModal from '@/app/components/Rendiciones/RendicionNuevaModal';
import { libroDeListado } from '@/app/components/Rendiciones/exportarRendiciones';
import { COLUMNAS_IMPORTE, ESTADO_LABEL } from '@/app/components/Rendiciones/rendicionesFormato';
import { fmtFecha, fmtMoneda, fmtNumero, fmtPeriodo } from '@/app/components/Facturacion/formato';
import { usePermiso } from '@/app/hooks/usePermiso';
import { rendicionesService, type FiltrosRendiciones } from '@/app/services/rendicionesService';
import { mensajeDeError } from '@/app/utils/apiError';
import { descargarLibroExcel } from '@/app/utils/export/libroExcel';
import type { CatalogosRendicion, EstadoRendicion, ListadoRendiciones } from '@/app/types/rendiciones';
import c from '@/app/components/Facturacion/Facturacion.module.css';

const TAM_PAGINA = 50;

const KPIS: { id: EstadoRendicion | ''; label: string; clave: 'total' | EstadoRendicion }[] = [
	{ id: '', label: 'Rendiciones', clave: 'total' },
	{ id: 'abierta', label: 'Abiertas', clave: 'abierta' },
	{ id: 'cerrada', label: 'Cerradas', clave: 'cerrada' },
];

export default function RendicionesPage() {
	const toast = useToast();
	const { puede, loaded } = usePermiso();
	const puedeVer = puede('FACTURACION.RENDICIONES.VER');
	const permisos = {
		crear: puede('FACTURACION.RENDICIONES.CREAR'),
		editar: puede('FACTURACION.RENDICIONES.EDITAR'),
		eliminar: puede('FACTURACION.RENDICIONES.ELIMINAR'),
		exportar: puede('FACTURACION.RENDICIONES.EXPORTAR'),
	};

	const [catalogos, setCatalogos] = useState<CatalogosRendicion | null>(null);
	const [intentoCatalogos, setIntentoCatalogos] = useState(0);
	const [cliente, setCliente] = useState<number | ''>('');
	const [tipo, setTipo] = useState('');
	const [desde, setDesde] = useState('');
	const [hasta, setHasta] = useState('');
	const [q, setQ] = useState('');
	const [qAplicada, setQAplicada] = useState('');
	const [estado, setEstado] = useState<EstadoRendicion | ''>('');
	const [pagina, setPagina] = useState(1);
	const [listado, setListado] = useState<ListadoRendiciones | null>(null);
	const [cargando, setCargando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [abierta, setAbierta] = useState<number | null>(null);
	const [nuevaAbierta, setNuevaAbierta] = useState(false);
	const [exportando, setExportando] = useState(false);
	const [recarga, setRecarga] = useState(0);

	useEffect(() => {
		if (!loaded || !puedeVer) return;
		rendicionesService
			.catalogos()
			.then(setCatalogos)
			.catch((e) => setError(mensajeDeError(e, 'No se pudieron cargar los catálogos')));
	}, [loaded, puedeVer, intentoCatalogos]);

	useEffect(() => {
		const t = setTimeout(() => {
			setQAplicada(q.trim());
			setPagina(1);
		}, 350);
		return () => clearTimeout(t);
	}, [q]);

	const filtros: FiltrosRendiciones = { q: qAplicada || undefined, cliente, tipo, desde, hasta, estado };
	const claveFiltros = JSON.stringify(filtros);

	useEffect(() => {
		if (!loaded || !puedeVer) return;
		let vigente = true;
		setCargando(true);
		setError(null);
		rendicionesService
			.listar({ ...JSON.parse(claveFiltros), pagina, tamPagina: TAM_PAGINA })
			.then((r) => vigente && setListado(r))
			.catch((e) => vigente && setError(mensajeDeError(e, 'No se pudieron cargar las rendiciones')))
			.finally(() => vigente && setCargando(false));
		return () => {
			vigente = false;
		};
	}, [loaded, puedeVer, claveFiltros, pagina, recarga]);

	const refrescar = useCallback(() => setRecarga((n) => n + 1), []);
	const cambiarFiltro = <T,>(set: (v: T) => void) => (v: T) => {
		set(v);
		setPagina(1);
	};

	const exportar = async () => {
		setExportando(true);
		try {
			const filas = await rendicionesService.exportar(filtros);
			const descripcion: [string, string][] = [];
			if (cliente !== '') descripcion.push(['Cliente', catalogos?.clientes.find((x) => x.valor === cliente)?.razonSocial || String(cliente)]);
			if (tipo) descripcion.push(['Tipo', catalogos?.tiposCliente.find((x) => x.valor === tipo)?.descripcion || tipo]);
			if (desde || hasta) descripcion.push(['Período', `${desde || '…'} a ${hasta || '…'}`]);
			if (estado) descripcion.push(['Estado', ESTADO_LABEL[estado]]);
			if (qAplicada) descripcion.push(['Búsqueda', qAplicada]);
			await descargarLibroExcel(libroDeListado(filas, descripcion));
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo generar el Excel'));
		} finally {
			setExportando(false);
		}
	};

	if (loaded && !puedeVer) {
		return <p className={c.warning}>No tenés permiso para ver las rendiciones.</p>;
	}

	const totalPaginas = listado ? Math.max(1, Math.ceil(listado.total / TAM_PAGINA)) : 1;
	const hayFiltros = Boolean(qAplicada || cliente !== '' || tipo || desde || hasta || estado);
	const opcionesCliente = [
		{ value: '', label: 'Todos los clientes' },
		...(catalogos?.clientes || []).map((o) => ({ value: o.valor, label: o.razonSocial })),
	];
	const imp = listado?.resumen.importes;

	return (
		<div className={c.page}>
			<div className={c.mainCard}>
				<div className={c.cardHeader}>
					<div className={c.cardHeaderTop}>
						<div>
							<h1 className={c.cardTitle}>Rendiciones</h1>
							<p className={c.cardSubtitle}>
								Visitas valorizadas con el convenio de cada cliente, agrupadas por período, listas para facturar.
							</p>
						</div>
						<div className={c.cardHeaderActions}>
							{permisos.exportar ? (
								<button
									type='button'
									className={c.headerActionBtn}
									onClick={exportar}
									disabled={exportando || !listado?.total}
								>
									<FileDown size={15} aria-hidden />
									{exportando ? 'Generando…' : 'Exportar Excel'}
								</button>
							) : null}
							{permisos.crear ? (
								<button type='button' className={`${c.headerActionBtn} ${c.headerActionPrimary}`} onClick={() => setNuevaAbierta(true)}>
									<Plus size={15} aria-hidden />
									Agregar rendición
								</button>
							) : null}
						</div>
					</div>
				</div>

				<div className={c.cardBody}>
					<div className={c.kpis}>
						{KPIS.map((k) => (
							<button
								key={k.clave}
								type='button'
								className={`${c.kpi} ${estado === k.id ? c.kpiActive : ''}`}
								onClick={() => {
									setEstado(k.id === '' || estado === k.id ? '' : k.id);
									setPagina(1);
								}}
							>
								<div className={c.kpiValue}>{listado ? fmtNumero(listado.resumen[k.clave]) : '—'}</div>
								<div className={c.kpiLabel}>{k.label}</div>
							</button>
						))}
						{(['honorarios', 'gastos', 'medicamentos', 'total'] as const).map((k) => (
							<div key={k} className={c.kpi} style={{ cursor: 'default' }}>
								<div className={c.kpiValue} style={{ fontSize: '1.05rem', color: '#9a3412' }}>
									{imp ? fmtMoneda(imp[k]) : '—'}
								</div>
								<div className={c.kpiLabel}>{COLUMNAS_IMPORTE.find((x) => x.clave === k)?.label}</div>
							</div>
						))}
					</div>

					<div className={`${c.filtersBar} ${c.filtersBarAmplia}`}>
						<CustomSelect
							label='Cliente'
							name='rend-f-cliente'
							value={cliente}
							isLoading={!catalogos}
							onChange={(v) => cambiarFiltro(setCliente)(v === '' || v == null ? '' : Number(v))}
							options={opcionesCliente}
						/>
						<div className={c.campo}>
							<label htmlFor='rend-f-tipo'>Tipo</label>
							<select id='rend-f-tipo' className={c.select} value={tipo} onChange={(e) => cambiarFiltro(setTipo)(e.target.value)}>
								<option value=''>Todos</option>
								{(catalogos?.tiposCliente || []).map((t) => (
									<option key={t.valor} value={t.valor}>
										{t.descripcion}
									</option>
								))}
							</select>
						</div>
						<div className={c.campo}>
							<label htmlFor='rend-f-desde'>Período desde</label>
							<input id='rend-f-desde' type='month' className={c.input} value={desde} onChange={(e) => cambiarFiltro(setDesde)(e.target.value)} />
						</div>
						<div className={c.campo}>
							<label htmlFor='rend-f-hasta'>Período hasta</label>
							<input id='rend-f-hasta' type='month' className={c.input} value={hasta} onChange={(e) => cambiarFiltro(setHasta)(e.target.value)} />
						</div>
						<div className={c.campo}>
							<label htmlFor='rend-f-q'>Buscar</label>
							<input
								id='rend-f-q'
								type='search'
								className={c.input}
								value={q}
								onChange={(e) => setQ(e.target.value)}
								placeholder='N° de rendición o convenio, cliente, observaciones'
							/>
						</div>
					</div>

					{error ? (
						<div className={`${c.error} ${c.errorFila}`}>
							<span>{error}</span>
							<button
								type='button'
								className={c.headerActionBtn}
								onClick={() => {
									if (!catalogos) setIntentoCatalogos((n) => n + 1);
									refrescar();
								}}
							>
								Reintentar
							</button>
						</div>
					) : null}

					{cargando && !listado ? (
						<div className={c.loading}>
							<span className={c.spinner} aria-hidden /> Cargando rendiciones…
						</div>
					) : listado && listado.filas.length === 0 ? (
						<p className={c.empty}>{hayFiltros ? 'Ninguna rendición coincide con los filtros.' : 'Todavía no hay rendiciones.'}</p>
					) : listado ? (
						<div className={c.tableWrap} style={{ opacity: cargando ? 0.6 : 1 }}>
							<table className={c.table}>
								<thead>
									<tr>
										<th colSpan={4} />
										<th colSpan={2} className={`${c.grupoTitulo} ${c.thCobertura}`}>
											Cobertura
										</th>
										<th />
										<th colSpan={COLUMNAS_IMPORTE.length} className={`${c.grupoTitulo} ${c.thImporte}`}>
											Importes
										</th>
										<th colSpan={2} />
									</tr>
									<tr>
										<th className={c.num}>N°</th>
										<th>Fecha</th>
										<th>Tipo</th>
										<th>Cliente</th>
										<th className={c.thCobertura}>Convenio</th>
										<th className={c.thCobertura}>Observaciones</th>
										<th>Período</th>
										{COLUMNAS_IMPORTE.map((col) => (
											<th key={col.clave} className={`${c.num} ${c.thImporte}`}>
												{col.corta}
											</th>
										))}
										<th className={c.num}>Visitas</th>
										<th>Estado</th>
									</tr>
								</thead>
								<tbody>
									{listado.filas.map((f) => (
										<tr key={f.id} className={c.filaClickable} onClick={() => setAbierta(f.id)}>
											<td className={c.num}>
												<button
													type='button'
													className={c.codigoLink}
													onClick={(e) => {
														e.stopPropagation();
														setAbierta(f.id);
													}}
													title='Abrir la rendición'
												>
													{f.id}
												</button>
											</td>
											<td className={c.subtexto}>{f.fechaGraba ? fmtFecha(f.fechaGraba.slice(0, 10)) : '—'}</td>
											<td>
												<span className={c.badge}>{f.tipoCliente.valor || '—'}</span>
											</td>
											<td>
												<span className={c.descripcion}>{f.cliente.razonSocial || '—'}</span>
												<span className={c.subtexto}>Código {f.cliente.valor}</span>
											</td>
											<td className={c.tdCobertura}>
												<span className={c.descripcion}>#{f.convenio.codigo}</span>
												<span className={c.subtexto}>{f.convenio.descripcion || 'Convenio inexistente'}</span>
											</td>
											<td className={`${c.tdCobertura} ${c.subtexto}`} style={{ maxWidth: 220 }}>
												{f.observaciones || '—'}
											</td>
											<td style={{ whiteSpace: 'nowrap' }}>{fmtPeriodo(f.periodo) || <span className={c.subtexto}>Sin período</span>}</td>
											{COLUMNAS_IMPORTE.map((col) => (
												<td key={col.clave} className={`${c.num} ${c.tdImporte} ${f.importes[col.clave] ? '' : c.numMuted}`}>
													{col.clave === 'total' ? <strong>{fmtMoneda(f.importes.total)}</strong> : fmtMoneda(f.importes[col.clave])}
												</td>
											))}
											<td className={`${c.num} ${f.visitas ? '' : c.numMuted}`}>{fmtNumero(f.visitas)}</td>
											<td>
												<span className={`${c.badge} ${c[`badge_${f.estado}`]}`}>{ESTADO_LABEL[f.estado]}</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : null}

					{listado && listado.total > 0 ? (
						<div className={c.paginacion}>
							<span>
								{fmtNumero(listado.total)} rendicion{listado.total === 1 ? '' : 'es'}
								{totalPaginas > 1 ? ` · página ${pagina} de ${totalPaginas}` : ''}
							</span>
							<Pagination currentPage={pagina} totalPages={totalPaginas} onPageChange={setPagina} />
						</div>
					) : null}
				</div>
			</div>

			<RendicionDetalleModal id={abierta} catalogos={catalogos} permisos={permisos} onClose={() => setAbierta(null)} onCambio={refrescar} />
			<RendicionNuevaModal
				open={nuevaAbierta}
				catalogos={catalogos}
				cliente={cliente}
				onClose={() => setNuevaAbierta(false)}
				onCreada={(id) => {
					setNuevaAbierta(false);
					refrescar();
					setAbierta(id);
				}}
			/>
		</div>
	);
}
