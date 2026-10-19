'use client';

import { useEffect, useState } from 'react';
import Pagination from '@/app/components/UI/Pagination';
import InfoHint from '@/app/components/UI/InfoHint';
import { rendicionesService } from '@/app/services/rendicionesService';
import { mensajeDeError } from '@/app/utils/apiError';
import type {
	CatalogosRendicion,
	FacturaRendicion,
	LineaRendida,
	Pagina,
	RendicionDetalle,
	TipoPrestacion,
	VisitaRendida,
} from '@/app/types/rendiciones';
import { fmtFecha, fmtMoneda, fmtNumero, fmtPeriodo } from '@/app/components/Facturacion/formato';
import { COLUMNAS_IMPORTE, VALORIZACION } from './rendicionesFormato';
import s from '@/app/components/admission/visitDetail/VisitDetail.module.css';
import c from '@/app/components/Facturacion/Facturacion.module.css';

const TAM_VISITAS = 50;
const TAM_LINEAS = 100;

function Cargando({ texto }: { texto: string }) {
	return (
		<div className={s.stateBox} role='status'>
			<span className={s.spinner} aria-hidden />
			<span>{texto}</span>
		</div>
	);
}

/** Hook de una página remota que se recarga cuando cambia `clave`. */
function usePagina<T>(cargar: () => Promise<Pagina<T>>, clave: string) {
	const [datos, setDatos] = useState<Pagina<T> | null>(null);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		let vigente = true;
		setCargando(true);
		setError(null);
		cargar()
			.then((d) => vigente && setDatos(d))
			.catch((e) => vigente && setError(mensajeDeError(e, 'No se pudo cargar el detalle')))
			.finally(() => vigente && setCargando(false));
		return () => {
			vigente = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- `clave` resume los parámetros de `cargar`
	}, [clave]);
	return { datos, cargando, error };
}

// ─── Totales: cabecera vs. suma de prestaciones ────────────────────────────

export function TotalesRendicion({ r }: { r: RendicionDetalle }) {
	const filas = [
		...COLUMNAS_IMPORTE.map((col) => ({
			id: col.clave,
			label: col.label,
			cabecera: fmtMoneda(r.importes[col.clave]),
			detalle: fmtMoneda(r.detalle.importes[col.clave]),
			difiere: col.clave !== 'total' && r.diferencias.includes(col.clave),
		})),
		{
			id: 'visitas',
			label: 'Visitas',
			cabecera: fmtNumero(r.visitas),
			detalle: fmtNumero(r.detalle.visitas),
			difiere: r.diferencias.includes('visitas'),
		},
	];
	return (
		<div className={c.tableWrap}>
			<table className={c.table}>
				<thead>
					<tr>
						<th>Concepto</th>
						<th className={`${c.num} ${c.thImporte}`}>
							Cabecera
							<InfoHint label='cabecera' text='Totales grabados en la rendición por el sistema de escritorio.' />
						</th>
						<th className={`${c.num} ${c.thImporte}`}>
							Suma de prestaciones
							<InfoHint label='suma de prestaciones' text='Recalculado ahora desde las prestaciones valorizadas de la rendición.' />
						</th>
					</tr>
				</thead>
				<tbody>
					{filas.map((f) => (
						<tr key={f.id}>
							<td>{f.id === 'total' ? <strong>{f.label}</strong> : f.label}</td>
							<td className={`${c.num} ${c.tdImporte}`}>{f.cabecera}</td>
							<td className={`${c.num} ${c.tdImporte} ${f.difiere ? c.alertaDiferencia : ''}`}>
								{f.detalle}
								{f.difiere ? ' ⚠' : ''}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

// ─── Pacientes y prácticas (maestro / detalle) ─────────────────────────────

const RUBRO: Record<string, string> = { H: 'HON', G: 'GAS', M: 'MED', Y: 'OTR' };

/** Texto de la línea como lo muestra el escritorio: en honorarios, función abreviada y profesional. */
function descripcionLinea(l: LineaRendida): string {
	if (l.tipo.valor === 'H' && l.profesional) {
		const fn = (l.funcion?.descripcion || '').slice(0, 3).toUpperCase();
		const prof = `${l.profesional.matricula}-${l.profesional.nombre || 'Sin nombre'}`;
		return fn ? `${fn}: ${prof}` : prof;
	}
	return l.practica.descripcion || 'Sin descripción en catálogo';
}

function documento(v: VisitaRendida): string {
	const d = v.paciente.documento;
	if (!d) return '—';
	return `${d.tipo && d.tipo !== 'DNI' ? `${d.tipo} ` : ''}${d.numero}`;
}

export function SeccionPacientes({ id }: { id: number }) {
	const [q, setQ] = useState('');
	const [qAplicada, setQAplicada] = useState('');
	const [sinValor, setSinValor] = useState(false);
	const [pagina, setPagina] = useState(1);
	const [elegida, setElegida] = useState<VisitaRendida | null>(null);
	const [paginaLineas, setPaginaLineas] = useState(1);

	useEffect(() => {
		const t = setTimeout(() => {
			setQAplicada(q.trim());
			setPagina(1);
		}, 350);
		return () => clearTimeout(t);
	}, [q]);

	const visitas = usePagina<VisitaRendida>(
		() => rendicionesService.visitas(id, { q: qAplicada || undefined, sinValor, pagina, tamPagina: TAM_VISITAS }),
		`${id}|${qAplicada}|${sinValor}|${pagina}`,
	);

	useEffect(() => {
		const filas = visitas.datos?.filas || [];
		setElegida((actual) => filas.find((v) => v.numeroVisita === actual?.numeroVisita) || filas[0] || null);
		setPaginaLineas(1);
	}, [visitas.datos]);

	const nroVisita = elegida?.numeroVisita ?? null;
	const lineas = usePagina<LineaRendida>(
		() =>
			nroVisita === null
				? Promise.resolve({ filas: [], total: 0, pagina: 1, tamPagina: TAM_LINEAS })
				: rendicionesService.lineas(id, { visita: nroVisita, pagina: paginaLineas, tamPagina: TAM_LINEAS }),
		`${id}|${nroVisita}|${paginaLineas}`,
	);

	const totalPaginas = visitas.datos ? Math.max(1, Math.ceil(visitas.datos.total / TAM_VISITAS)) : 1;
	const totalPaginasLineas = lineas.datos ? Math.max(1, Math.ceil(lineas.datos.total / TAM_LINEAS)) : 1;

	return (
		<div className={c.maestroDetalle}>
			<div className={c.accionesGrilla}>
				<input
					type='search'
					className={c.input}
					style={{ maxWidth: 320 }}
					value={q}
					onChange={(e) => setQ(e.target.value)}
					placeholder='N° de admisión o paciente'
					aria-label='Buscar paciente'
				/>
				<label className={c.check}>
					<input
						type='checkbox'
						checked={sinValor}
						onChange={(e) => {
							setSinValor(e.target.checked);
							setPagina(1);
						}}
					/>
					Solo con prácticas sin valor
				</label>
			</div>

			{visitas.error ? <p className={c.error}>{visitas.error}</p> : null}
			{visitas.cargando && !visitas.datos ? (
				<Cargando texto='Cargando pacientes…' />
			) : visitas.datos && visitas.datos.filas.length === 0 ? (
				<p className={s.empty}>{qAplicada || sinValor ? 'Ningún paciente coincide con el filtro.' : 'La rendición no tiene pacientes.'}</p>
			) : visitas.datos ? (
				<>
					<div className={`${c.grillaWrap} ${c.grillaMaestro}`} style={{ opacity: visitas.cargando ? 0.6 : 1 }}>
						<table className={c.grilla}>
							<thead>
								<tr>
									<th title='Clase de paciente'>Cl.</th>
									<th className={c.num}>N° Adm.</th>
									<th>Paciente</th>
									<th className={c.num}>Documento</th>
									<th>Ingreso</th>
									<th>Egreso</th>
									<th className={c.num}>Honorarios</th>
									<th className={c.num}>Gastos</th>
									<th className={c.num}>Medicamentos</th>
									<th className={c.num}>Otros</th>
									<th className={c.num}>Total admisión</th>
								</tr>
							</thead>
							<tbody>
								{visitas.datos.filas.map((v) => (
									<tr
										key={v.numeroVisita}
										className={`${c.filaClickable} ${v.numeroVisita === nroVisita ? c.filaSeleccionada : ''}`}
										onClick={() => {
											setElegida(v);
											setPaginaLineas(1);
										}}
										aria-selected={v.numeroVisita === nroVisita}
									>
										<td title={v.clase?.descripcion}>{v.clase?.valor || '—'}</td>
										<td className={c.num}>{v.numeroVisita}</td>
										<td>
											{v.paciente.nombre || <span className={c.subtexto}>Sin paciente</span>}
											{v.sinValor ? (
												<span className={c.alertaDiferencia} title='Prácticas en $ 0'>
													{' '}
													· {fmtNumero(v.sinValor)} sin valor
												</span>
											) : null}
										</td>
										<td className={c.num}>{documento(v)}</td>
										<td>{fmtFecha(v.ingreso) || '—'}</td>
										<td>{fmtFecha(v.egreso) || '—'}</td>
										{(['honorarios', 'gastos', 'medicamentos', 'otros'] as const).map((k) => (
											<td key={k} className={`${c.num} ${v.importes[k] ? '' : c.numMuted}`}>
												{fmtMoneda(v.importes[k])}
											</td>
										))}
										<td className={c.num}>
											<strong>{fmtMoneda(v.importes.total)}</strong>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{visitas.datos.total > TAM_VISITAS ? (
						<div className={c.paginacion}>
							<span>{fmtNumero(visitas.datos.total)} pacientes</span>
							<Pagination currentPage={pagina} totalPages={totalPaginas} onPageChange={setPagina} />
						</div>
					) : null}
				</>
			) : null}

			{elegida ? (
				<>
					<h4 className={c.seccionTitulo}>
						Prácticas de la admisión {elegida.numeroVisita}
						{elegida.paciente.nombre ? ` · ${elegida.paciente.nombre}` : ''}
					</h4>
					{lineas.error ? <p className={c.error}>{lineas.error}</p> : null}
					{lineas.cargando && !lineas.datos ? (
						<Cargando texto='Cargando prácticas…' />
					) : lineas.datos && lineas.datos.filas.length === 0 ? (
						<p className={s.empty}>La admisión no tiene prácticas rendidas.</p>
					) : lineas.datos ? (
						<div className={`${c.grillaWrap} ${c.grillaDetalle}`} style={{ opacity: lineas.cargando ? 0.6 : 1 }}>
							<table className={c.grilla}>
								<thead>
									<tr>
										<th>Rubro</th>
										<th title='Tipo de práctica en el nomenclador'>L</th>
										<th className={c.num}>Código</th>
										<th>Descripción</th>
										<th>Mód.</th>
										<th>Fecha</th>
										<th className={c.num}>%</th>
										<th className={c.num}>Imp. unitario</th>
										<th className={c.num}>Cant.</th>
										<th className={c.num}>Importe</th>
									</tr>
								</thead>
								<tbody>
									{lineas.datos.filas.map((l) => (
										<tr key={l.id}>
											<td title={l.tipo.descripcion}>{RUBRO[l.tipo.valor] || l.tipo.valor}</td>
											<td>{l.practica.tipo || ''}</td>
											<td className={c.num}>{l.practica.codigo}</td>
											<td title={l.practica.descripcion || undefined}>{descripcionLinea(l)}</td>
											<td title={l.modulo.descripcion}>{l.modulo.valor}</td>
											<td>{fmtFecha(l.fecha) || '—'}</td>
											<td className={c.num}>{fmtNumero(l.porcentaje)}</td>
											<td className={c.num}>{fmtMoneda(l.importeUnitario)}</td>
											<td className={c.num}>{fmtNumero(l.cantidad)}</td>
											<td className={`${c.num} ${l.importeFinal ? '' : c.alertaDiferencia}`}>
												<strong>{fmtMoneda(l.importeFinal)}</strong>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : null}
					{lineas.datos && lineas.datos.total > TAM_LINEAS ? (
						<div className={c.paginacion}>
							<span>{fmtNumero(lineas.datos.total)} prácticas</span>
							<Pagination currentPage={paginaLineas} totalPages={totalPaginasLineas} onPageChange={setPaginaLineas} />
						</div>
					) : null}
				</>
			) : null}
		</div>
	);
}

// ─── Prestaciones ──────────────────────────────────────────────────────────

interface PropsPrestaciones {
	id: number;
	catalogos: CatalogosRendicion;
}

export function SeccionPrestaciones({ id, catalogos }: PropsPrestaciones) {
	const [tipo, setTipo] = useState<TipoPrestacion | ''>('');
	const [sinValor, setSinValor] = useState(false);
	const [pagina, setPagina] = useState(1);

	const { datos, cargando, error } = usePagina<LineaRendida>(
		() => rendicionesService.lineas(id, { tipo, sinValor, pagina, tamPagina: TAM_LINEAS }),
		`${id}|${tipo}|${sinValor}|${pagina}`,
	);
	const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / TAM_LINEAS)) : 1;

	return (
		<>
			<p className={c.info} style={{ marginBottom: 12 }}>
				Cada prestación se compara con la regla que el convenio tiene <strong>hoy</strong> para esa práctica y función. &ldquo;Difiere&rdquo;
				suele indicar que se valorizó con un valor anterior o que se corrigió a mano.
			</p>
			<div className={c.accionesGrilla}>
				<select
					className={c.select}
					style={{ maxWidth: 220 }}
					value={tipo}
					onChange={(e) => {
						setTipo(e.target.value as TipoPrestacion | '');
						setPagina(1);
					}}
					aria-label='Tipo de prestación'
				>
					<option value=''>Todos los tipos</option>
					{catalogos.tiposPrestacion.map((t) => (
						<option key={t.valor} value={t.valor}>
							{t.descripcion}
						</option>
					))}
				</select>
				<label className={c.check}>
					<input
						type='checkbox'
						checked={sinValor}
						onChange={(e) => {
							setSinValor(e.target.checked);
							setPagina(1);
						}}
					/>
					Solo sin valor ($ 0)
				</label>
			</div>
			{error ? <p className={c.error}>{error}</p> : null}
			{cargando && !datos ? (
				<Cargando texto='Cargando prestaciones…' />
			) : datos && datos.filas.length === 0 ? (
				<p className={s.empty}>Ninguna prestación coincide con el filtro.</p>
			) : datos ? (
				<div className={c.tableWrap} style={{ opacity: cargando ? 0.6 : 1 }}>
					<table className={c.table}>
						<thead>
							<tr>
								<th colSpan={5} />
								<th colSpan={2} className={`${c.grupoTitulo} ${c.thCobertura}`}>
									Convenio
								</th>
								<th colSpan={4} className={`${c.grupoTitulo} ${c.thImporte}`}>
									Valorización
								</th>
							</tr>
							<tr>
								<th>Fecha</th>
								<th>Visita / paciente</th>
								<th>Tipo</th>
								<th>Práctica</th>
								<th>Profesional</th>
								<th className={c.thCobertura}>Regla</th>
								<th className={c.thCobertura}>Estado</th>
								<th className={`${c.num} ${c.thImporte}`}>Cant.</th>
								<th className={`${c.num} ${c.thImporte}`}>%</th>
								<th className={`${c.num} ${c.thImporte}`}>Unitario</th>
								<th className={`${c.num} ${c.thImporte}`}>Importe</th>
							</tr>
						</thead>
						<tbody>
							{datos.filas.map((l) => {
								const v = VALORIZACION[l.valorizacion.estado];
								return (
									<tr key={l.id}>
										<td className={c.subtexto}>{fmtFecha(l.fecha) || '—'}</td>
										<td>
											<span className={c.descripcion}>{l.numeroVisita}</span>
											<span className={c.subtexto}>{l.paciente || 'Sin paciente'}</span>
										</td>
										<td>
											<span className={c.descripcion}>{l.tipo.descripcion}</span>
											<span className={c.subtexto}>{l.modulo.descripcion}</span>
										</td>
										<td>
											<span className={c.descripcion}>{l.practica.codigo}</span>
											<span className={c.subtexto}>{l.practica.descripcion || 'Sin descripción en catálogo'}</span>
										</td>
										<td>
											{l.profesional ? (
												<>
													<span className={c.descripcion}>{l.profesional.nombre || `Matrícula ${l.profesional.matricula}`}</span>
													<span className={c.subtexto}>
														{l.funcion?.descripcion || (l.funcion ? `Función ${l.funcion.valor}` : '')}
														{l.profesional.nombre ? ` · MP ${l.profesional.matricula}` : ''}
													</span>
												</>
											) : (
												<span className={c.subtexto}>—</span>
											)}
										</td>
										<td className={`${c.tdCobertura} ${c.num}`}>
											{l.regla ? (
												<>
													{l.regla.tipoValor === '$' ? fmtMoneda(l.regla.valor) : l.regla.tipoValor === '%' ? `${fmtNumero(l.regla.valor)} %` : 'Calculado'}
													<span className={c.subtexto}>
														{l.regla.desde === l.regla.hasta ? `Práctica ${l.regla.desde}` : `${l.regla.desde}–${l.regla.hasta}`}
													</span>
												</>
											) : (
												<span className={c.subtexto}>—</span>
											)}
										</td>
										<td className={c.tdCobertura} title={v.ayuda}>
											<span className={`${c.badge} ${c[`badge_${l.valorizacion.estado}`]}`}>{v.label}</span>
											{l.valorizacion.manual ? <span className={c.subtexto}>Carga manual</span> : null}
										</td>
										<td className={`${c.num} ${c.tdImporte}`}>{fmtNumero(l.cantidad)}</td>
										<td className={`${c.num} ${c.tdImporte}`}>{fmtNumero(l.porcentaje)}</td>
										<td className={`${c.num} ${c.tdImporte}`}>{fmtMoneda(l.importeUnitario)}</td>
										<td className={`${c.num} ${c.tdImporte} ${l.importeFinal ? '' : c.alertaDiferencia}`}>
											<strong>{fmtMoneda(l.importeFinal)}</strong>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			) : null}
			{datos && datos.total > TAM_LINEAS ? (
				<div className={c.paginacion} style={{ marginTop: 10 }}>
					<span>{fmtNumero(datos.total)} prestaciones</span>
					<Pagination currentPage={pagina} totalPages={totalPaginas} onPageChange={setPagina} />
				</div>
			) : null}
		</>
	);
}

// ─── Facturas ──────────────────────────────────────────────────────────────

export function SeccionFacturas({ id }: { id: number }) {
	const [facturas, setFacturas] = useState<FacturaRendicion[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		let vigente = true;
		setFacturas(null);
		rendicionesService
			.facturas(id)
			.then((f) => vigente && setFacturas(f))
			.catch((e) => vigente && setError(mensajeDeError(e, 'No se pudieron cargar las facturas')));
		return () => {
			vigente = false;
		};
	}, [id]);

	if (error) return <p className={c.error}>{error}</p>;
	if (!facturas) return <Cargando texto='Cargando facturas…' />;
	if (!facturas.length) return <p className={s.empty}>Todavía no se emitió ninguna factura desde esta rendición.</p>;
	return (
		<div className={c.tableWrap}>
			<table className={c.table}>
				<thead>
					<tr>
						<th>Comprobante</th>
						<th>Fecha</th>
						<th>Período</th>
						<th>Razón social</th>
						<th className={`${c.num} ${c.thImporte}`}>Neto</th>
						<th className={`${c.num} ${c.thImporte}`}>IVA</th>
						<th className={`${c.num} ${c.thImporte}`}>Total</th>
						<th className={`${c.num} ${c.thImporte}`}>Saldo</th>
					</tr>
				</thead>
				<tbody>
					{facturas.map((f) => (
						<tr key={f.id}>
							<td>
								<span className={c.descripcion}>
									{f.comprobante} {f.letra} {String(f.sucursal).padStart(4, '0')}-{String(f.numero).padStart(8, '0')}
								</span>
								<span className={c.subtexto}>Id {f.id}</span>
							</td>
							<td className={c.subtexto}>{fmtFecha(f.fechaGraba) || '—'}</td>
							<td className={c.subtexto}>{fmtPeriodo(f.periodo) || '—'}</td>
							<td>{f.razonSocial || '—'}</td>
							<td className={`${c.num} ${c.tdImporte}`}>{fmtMoneda(f.neto)}</td>
							<td className={`${c.num} ${c.tdImporte}`}>
								{fmtMoneda(f.iva)}
								<span className={c.subtexto}>{fmtNumero(f.porcentajeIva)} %</span>
							</td>
							<td className={`${c.num} ${c.tdImporte}`}>
								<strong>{fmtMoneda(f.total)}</strong>
							</td>
							<td className={`${c.num} ${c.tdImporte}`}>{fmtMoneda(f.saldo)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
