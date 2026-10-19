'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import Pagination from '@/app/components/UI/Pagination';
import ConvenioDetalleModal from '@/app/components/Convenios/ConvenioDetalleModal';
import ConvenioNuevoModal from '@/app/components/Convenios/ConvenioNuevoModal';
import ConveniosMantenimientoModal from '@/app/components/Convenios/ConveniosMantenimientoModal';
import { ESTADO_LABEL, PESTANA_CORTA, vigenciaTexto } from '@/app/components/Convenios/conveniosFormato';
import { fmtNumero } from '@/app/components/Facturacion/formato';
import { usePermiso } from '@/app/hooks/usePermiso';
import { conveniosService } from '@/app/services/conveniosService';
import { mensajeDeError } from '@/app/utils/apiError';
import type { CatalogosConvenio, EstadoVigencia, ListadoConvenios, PestanaId } from '@/app/types/convenios';
import c from '@/app/components/Facturacion/Facturacion.module.css';

const TAM_PAGINA = 50;

const KPIS: { id: EstadoVigencia | ''; label: string; clave: keyof ListadoConvenios['resumen'] }[] = [
	{ id: '', label: 'Total', clave: 'total' },
	{ id: 'vigente', label: 'Vigentes', clave: 'vigente' },
	{ id: 'futuro', label: 'Futuros', clave: 'futuro' },
	{ id: 'vencido', label: 'Vencidos', clave: 'vencido' },
	{ id: 'sin_vigencia', label: 'Sin vigencia', clave: 'sin_vigencia' },
];

const PESTANAS: PestanaId[] = ['valores', 'nomenclador', 'moduladas', 'vademecum', 'genericos', 'categorias', 'complejidad'];

export default function ConveniosPage() {
	const { puede, loaded } = usePermiso();
	const puedeVer = puede('FACTURACION.CONVENIOS.VER');
	const permisos = { crear: puede('FACTURACION.CONVENIOS.CREAR'), editar: puede('FACTURACION.CONVENIOS.EDITAR') };
	const puedeEliminar = puede('FACTURACION.CONVENIOS.ELIMINAR');

	const [catalogos, setCatalogos] = useState<CatalogosConvenio | null>(null);
	const [obraSocial, setObraSocial] = useState<number | ''>('');
	const [q, setQ] = useState('');
	const [qAplicada, setQAplicada] = useState('');
	const [estado, setEstado] = useState<EstadoVigencia | ''>('');
	const [pagina, setPagina] = useState(1);
	const [listado, setListado] = useState<ListadoConvenios | null>(null);
	const [cargando, setCargando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [abierto, setAbierto] = useState<number | null>(null);
	const [nuevoAbierto, setNuevoAbierto] = useState(false);
	const [mantenimientoAbierto, setMantenimientoAbierto] = useState(false);
	const [recarga, setRecarga] = useState(0);
	const [intentoCatalogos, setIntentoCatalogos] = useState(0);

	useEffect(() => {
		if (!loaded || !puedeVer) return;
		conveniosService
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

	useEffect(() => {
		if (!loaded || !puedeVer) return;
		let vigente = true;
		setCargando(true);
		setError(null);
		conveniosService
			.listar({ q: qAplicada || undefined, obraSocial, estado: estado || undefined, pagina, tamPagina: TAM_PAGINA })
			.then((r) => vigente && setListado(r))
			.catch((e) => vigente && setError(mensajeDeError(e, 'No se pudieron cargar los convenios')))
			.finally(() => vigente && setCargando(false));
		return () => {
			vigente = false;
		};
	}, [loaded, puedeVer, qAplicada, obraSocial, estado, pagina, recarga]);

	const refrescar = useCallback(() => setRecarga((n) => n + 1), []);

	if (loaded && !puedeVer) {
		return <p className={c.warning}>No tenés permiso para ver los convenios.</p>;
	}

	const totalPaginas = listado ? Math.max(1, Math.ceil(listado.total / TAM_PAGINA)) : 1;
	const opcionesOS = [
		{ value: '', label: 'Todas las obras sociales' },
		...(catalogos?.obrasSociales || []).map((o) => ({
			value: o.valor,
			label: o.razonSocial,
		})),
	];

	return (
		<div className={c.page}>
			<div className={c.mainCard}>
				<div className={c.cardHeader}>
					<div className={c.cardHeaderTop}>
						<div>
							<h1 className={c.cardTitle}>Convenios</h1>
							<p className={c.cardSubtitle}>Valores, nomenclador, moduladas, medicamentos y anestesistas que se pactan con cada obra social.</p>
						</div>
						<div className={c.cardHeaderActions}>
							<button type='button' className={c.headerActionBtn} onClick={() => setMantenimientoAbierto(true)}>
								<ShieldCheck size={15} aria-hidden />
								Consistencia
							</button>
							{permisos.crear ? (
								<button type='button' className={`${c.headerActionBtn} ${c.headerActionPrimary}`} onClick={() => setNuevoAbierto(true)}>
									<Plus size={15} aria-hidden />
									Nuevo convenio
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
					</div>

					<div className={c.filtersBar}>
						<CustomSelect
							label='Obra social'
							name='convenios-os'
							value={obraSocial}
							isLoading={!catalogos}
							onChange={(v) => {
								setObraSocial(v === '' || v == null ? '' : Number(v));
								setPagina(1);
							}}
							options={opcionesOS}
						/>
						<div className={c.campo}>
							<label htmlFor='convenios-q'>Buscar</label>
							<input
								id='convenios-q'
								type='search'
								className={c.input}
								value={q}
								onChange={(e) => setQ(e.target.value)}
								placeholder='Número de convenio, descripción u obra social'
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
							<span className={c.spinner} aria-hidden /> Cargando convenios…
						</div>
					) : listado && listado.filas.length === 0 ? (
						<p className={c.empty}>
							{qAplicada || obraSocial !== '' || estado ? 'Ningún convenio coincide con los filtros.' : 'Todavía no hay convenios cargados.'}
						</p>
					) : listado ? (
						<div className={c.tableWrap} style={{ opacity: cargando ? 0.6 : 1 }}>
							<table className={c.table}>
								<thead>
									<tr>
										<th className={c.num}>N°</th>
										<th>Convenio</th>
										<th>Obra social</th>
										<th>Vigencia</th>
										<th>Estado</th>
										{PESTANAS.map((p) => (
											<th key={p} className={c.num}>
												{PESTANA_CORTA[p]}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{listado.filas.map((f) => (
										<tr key={f.codigo} className={c.filaClickable} onClick={() => setAbierto(f.codigo)}>
											<td className={c.num}>
												<button type='button' className={c.codigoLink} onClick={() => setAbierto(f.codigo)} title='Abrir el convenio'>
													{f.codigo}
												</button>
											</td>
											<td>
												<span className={c.descripcion}>{f.descripcion || 'Sin descripción'}</span>
												{f.multiConvenio ? <span className={c.subtexto}>Multiconvenio</span> : null}
											</td>
											<td>
												<span className={c.descripcion}>{f.obraSocial.valor === 0 ? 'Convenio general' : f.obraSocial.razonSocial || '—'}</span>
												<span className={c.subtexto}>Código {f.obraSocial.valor}</span>
											</td>
											<td className={c.subtexto}>{vigenciaTexto(f.vigenciaDesde, f.vigenciaHasta)}</td>
											<td>
												<span className={`${c.badge} ${c[`badge_${f.estado}`]}`}>{ESTADO_LABEL[f.estado]}</span>
											</td>
											{PESTANAS.map((p) => (
												<td key={p} className={`${c.num} ${f.conteos[p] ? '' : c.numMuted}`}>
													{fmtNumero(f.conteos[p])}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : null}

					{listado && listado.total > 0 ? (
						<div className={c.paginacion}>
							<span>
								{fmtNumero(listado.total)} convenio{listado.total === 1 ? '' : 's'}
								{totalPaginas > 1 ? ` · página ${pagina} de ${totalPaginas}` : ''}
							</span>
							<Pagination currentPage={pagina} totalPages={totalPaginas} onPageChange={setPagina} />
						</div>
					) : null}
				</div>
			</div>

			<ConvenioDetalleModal
				codigo={abierto}
				catalogos={catalogos}
				permisos={permisos}
				onClose={() => setAbierto(null)}
				onCambio={refrescar}
				onAbrirOtro={setAbierto}
			/>
			<ConvenioNuevoModal
				open={nuevoAbierto}
				catalogos={catalogos}
				obraSocial={obraSocial}
				onClose={() => setNuevoAbierto(false)}
				onCreado={(codigo) => {
					setNuevoAbierto(false);
					refrescar();
					setAbierto(codigo);
				}}
			/>
			<ConveniosMantenimientoModal
				open={mantenimientoAbierto}
				puedeLimpiar={puedeEliminar}
				onClose={() => setMantenimientoAbierto(false)}
				onAbrirConvenio={setAbierto}
			/>
		</div>
	);
}
