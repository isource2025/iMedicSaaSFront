'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileDown, FileText, Receipt, Save, Users, Trash2, type LucideIcon } from 'lucide-react';
import ConfirmDialog from '@/app/components/Agenda/ConfirmDialog';
import Modal from '@/app/components/UI/Modal';
import { useToast } from '@/app/components/UI/ToastProvider';
import { rendicionesService } from '@/app/services/rendicionesService';
import { mensajeDeError } from '@/app/utils/apiError';
import { descargarLibroExcel } from '@/app/utils/export/libroExcel';
import type { CatalogosRendicion, DatosCabeceraRendicion, LineaRendida, RendicionDetalle, VisitaRendida } from '@/app/types/rendiciones';
import { fmtFecha, fmtMoneda, fmtNumero, fmtPeriodo } from '@/app/components/Facturacion/formato';
import RendicionCabeceraForm from './RendicionCabeceraForm';
import { SeccionFacturas, SeccionPacientes, SeccionPrestaciones, TotalesRendicion } from './RendicionSecciones';
import { libroDeRendicion } from './exportarRendiciones';
import { ESTADO_LABEL } from './rendicionesFormato';
import s from '@/app/components/admission/visitDetail/VisitDetail.module.css';
import c from '@/app/components/Facturacion/Facturacion.module.css';

type SeccionId = 'pacientes' | 'prestaciones' | 'datos' | 'facturas';

const GRUPOS: { id: string; label: string; icono: LucideIcon; secciones: SeccionId[] }[] = [
	{ id: 'pacientes', label: 'Gestionar pacientes', icono: Users, secciones: ['pacientes', 'prestaciones'] },
	{ id: 'rendicion', label: 'Rendición', icono: FileText, secciones: ['datos'] },
	{ id: 'facturas', label: 'Facturas', icono: Receipt, secciones: ['facturas'] },
];

const ETIQUETAS: Record<SeccionId, string> = {
	pacientes: 'Pacientes y prácticas',
	prestaciones: 'Control de valorización',
	datos: 'Datos y observaciones',
	facturas: 'Facturas emitidas',
};

/** Máximo de prestaciones que se bajan al Excel del detalle. */
const MAX_LINEAS_EXCEL = 20000;

interface Props {
	id: number | null;
	catalogos: CatalogosRendicion | null;
	permisos: { editar: boolean; eliminar: boolean; exportar: boolean };
	onClose: () => void;
	/** Algo cambió (datos o baja): el listado tiene que refrescarse. */
	onCambio: () => void;
}

const datosDe = (r: RendicionDetalle): DatosCabeceraRendicion => ({
	idCliente: r.cliente.valor,
	idConvenio: r.convenio.codigo,
	periodo: r.periodo ? r.periodo.slice(0, 7) : '',
	observaciones: r.observaciones,
});

const hayDialogoEncima = () =>
	typeof document !== 'undefined' &&
	(document.querySelectorAll('[role="dialog"]').length > 1 || Boolean(document.querySelector('[role="alertdialog"]')));

async function todasLasPaginas<T>(pedir: (pagina: number) => Promise<{ filas: T[]; total: number }>, tam: number, max: number) {
	const filas: T[] = [];
	for (let pagina = 1; ; pagina++) {
		const r = await pedir(pagina);
		filas.push(...r.filas);
		if (filas.length >= r.total || r.filas.length < tam) break;
		if (filas.length >= max) throw new Error(`La rendición tiene más de ${max.toLocaleString('es-AR')} prestaciones: no entra en un Excel.`);
	}
	return filas;
}

export default function RendicionDetalleModal({ id, catalogos, permisos, onClose, onCambio }: Props) {
	const toast = useToast();
	const [detalle, setDetalle] = useState<RendicionDetalle | null>(null);
	const [cargando, setCargando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [seccion, setSeccion] = useState<SeccionId>('pacientes');
	const [borrador, setBorrador] = useState<DatosCabeceraRendicion | null>(null);
	const [guardando, setGuardando] = useState(false);
	const [errorDatos, setErrorDatos] = useState<string | null>(null);
	const [salirSinGuardar, setSalirSinGuardar] = useState<SeccionId | 'cerrar' | null>(null);
	const [confirmarBorrado, setConfirmarBorrado] = useState(false);
	const [borrando, setBorrando] = useState(false);
	const [exportando, setExportando] = useState(false);

	const cargar = useCallback(async () => {
		if (!id) return;
		setCargando(true);
		setError(null);
		try {
			const d = await rendicionesService.obtener(id);
			setDetalle(d);
			setBorrador(datosDe(d));
		} catch (e) {
			setError(mensajeDeError(e, 'No se pudo cargar la rendición'));
		} finally {
			setCargando(false);
		}
	}, [id]);

	useEffect(() => {
		setDetalle(null);
		setBorrador(null);
		setSeccion('pacientes');
		setErrorDatos(null);
		cargar();
	}, [id, cargar]);

	const sucio = useMemo(
		() => Boolean(detalle && borrador && JSON.stringify(borrador) !== JSON.stringify(datosDe(detalle))),
		[detalle, borrador],
	);
	const editable = permisos.editar && detalle?.estado === 'abierta';

	const irA = (destino: SeccionId | 'cerrar') => {
		if (detalle) setBorrador(datosDe(detalle));
		setErrorDatos(null);
		if (destino === 'cerrar') onClose();
		else setSeccion(destino);
	};
	const navegar = (destino: SeccionId | 'cerrar') => {
		if (destino === seccion) return;
		if (sucio && seccion === 'datos') setSalirSinGuardar(destino);
		else irA(destino);
	};
	const pedirCierre = () => {
		if (!hayDialogoEncima()) navegar('cerrar');
	};

	const guardar = async () => {
		if (!detalle || !borrador) return;
		setGuardando(true);
		setErrorDatos(null);
		try {
			const cambios = detalle.detalle.lineas > 0 ? { observaciones: borrador.observaciones } : borrador;
			const d = await rendicionesService.actualizar(detalle.id, cambios);
			setDetalle(d);
			setBorrador(datosDe(d));
			toast.success('Rendición guardada.');
			onCambio();
		} catch (e) {
			setErrorDatos(mensajeDeError(e, 'No se pudo guardar la rendición'));
		} finally {
			setGuardando(false);
		}
	};

	const borrar = async () => {
		if (!detalle) return;
		setBorrando(true);
		try {
			await rendicionesService.eliminar(detalle.id);
			toast.success(`Rendición #${detalle.id} borrada.`);
			setConfirmarBorrado(false);
			onCambio();
			onClose();
		} catch (e) {
			setConfirmarBorrado(false);
			toast.error(mensajeDeError(e, 'No se pudo borrar la rendición'));
		} finally {
			setBorrando(false);
		}
	};

	const exportar = async () => {
		if (!detalle) return;
		setExportando(true);
		try {
			const [visitas, lineas, facturas] = await Promise.all([
				todasLasPaginas<VisitaRendida>((pagina) => rendicionesService.visitas(detalle.id, { pagina, tamPagina: 500 }), 500, MAX_LINEAS_EXCEL),
				todasLasPaginas<LineaRendida>((pagina) => rendicionesService.lineas(detalle.id, { pagina, tamPagina: 500 }), 500, MAX_LINEAS_EXCEL),
				rendicionesService.facturas(detalle.id),
			]);
			await descargarLibroExcel(libroDeRendicion(detalle, visitas, lineas, facturas));
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo generar el Excel'));
		} finally {
			setExportando(false);
		}
	};

	const conteo = (sec: SeccionId): number | null => {
		if (!detalle) return null;
		if (sec === 'pacientes') return detalle.detalle.visitas;
		if (sec === 'prestaciones') return detalle.detalle.lineas;
		if (sec === 'facturas') return detalle.detalle.facturas;
		return null;
	};

	const hechos: [string, string][] = detalle
		? [
				['Tipo de cobertura', `${detalle.tipoCliente.valor} · ${detalle.tipoCliente.descripcion}`],
				['Cobertura', `${detalle.cliente.valor} · ${detalle.cliente.razonSocial || 'Sin nombre'}`],
				['Convenio', `${detalle.convenio.codigo} · ${detalle.convenio.descripcion || 'Sin descripción'}`],
				['Período', fmtPeriodo(detalle.periodo) || 'Sin período'],
				['Fecha de grabación', detalle.fechaGraba ? fmtFecha(detalle.fechaGraba.slice(0, 10)) : '—'],
				['Sucursal / empresa', detalle.sucursal || detalle.empresa ? `${detalle.sucursal} / ${detalle.empresa}` : '—'],
		  ]
		: [];

	const resultados: [string, string][] = detalle
		? [
				['Gastos', fmtMoneda(detalle.importes.gastos)],
				['Honorarios', fmtMoneda(detalle.importes.honorarios)],
				['Medicamentos', fmtMoneda(detalle.importes.medicamentos)],
				['Otros servicios', fmtMoneda(detalle.importes.otros)],
				['Episodios', fmtNumero(detalle.visitas)],
		  ]
		: [];

	return (
		<>
			<Modal isOpen={id !== null} onClose={pedirCierre} title={id ? `Rendición #${id}` : 'Rendición'} size='full'>
				<div className={c.modalBody} style={{ flex: 1, minHeight: 0 }}>
					{cargando && !detalle ? (
						<div className={s.stateBox} role='status'>
							<span className={s.spinner} aria-hidden />
							<span>Cargando la rendición…</span>
						</div>
					) : !detalle || !catalogos ? (
						<p className={s.empty}>{error || 'No se pudo cargar la rendición.'}</p>
					) : (
						<div className={s.root}>
							<header className={s.header}>
								<div className={s.headerTop}>
									<div className={s.identity}>
										<div className={s.identityLine}>
											<h3 className={s.patientName}>Rendición N° {detalle.id}</h3>
											<span className={`${s.statusPill} ${detalle.estado === 'abierta' ? s.statusActivo : s.statusEgresado}`}>
												{ESTADO_LABEL[detalle.estado]}
											</span>
											{detalle.vacia ? <span className={s.statusPill}>Vacía</span> : null}
										</div>
										<p className={s.identityMeta}>
											<span>
												<strong>{detalle.cliente.razonSocial || `Cliente ${detalle.cliente.valor}`}</strong>
											</span>
											{detalle.observaciones ? <span>{detalle.observaciones}</span> : null}
										</p>
									</div>
									<div className={s.headerActions}>
										<button type='button' className={s.ghostBtn} onClick={pedirCierre}>
											← Volver al listado
										</button>
										{permisos.exportar ? (
											<button type='button' className={s.primaryBtn} onClick={exportar} disabled={exportando || detalle.vacia}>
												<FileDown size={16} aria-hidden />
												{exportando ? 'Generando…' : 'Exportar Excel'}
											</button>
										) : null}
									</div>
								</div>
								<dl className={s.facts}>
									{hechos.map(([k, v]) => (
										<div key={k} className={s.fact}>
											<dt>{k}</dt>
											<dd title={v}>{v}</dd>
										</div>
									))}
								</dl>
							</header>

							<div className={s.layout}>
								<nav className={s.nav} aria-label='Secciones de la rendición'>
									<div className={c.navResumen}>
										<p className={c.navResumenTitulo}>Resultados</p>
										<dl>
											{resultados.map(([k, v]) => (
												<div key={k} style={{ display: 'contents' }}>
													<dt>{k}</dt>
													<dd>{v}</dd>
												</div>
											))}
											<dt className={c.navResumenTotal}>Total</dt>
											<dd className={c.navResumenTotal}>{fmtMoneda(detalle.importes.total)}</dd>
										</dl>
									</div>
									{GRUPOS.map((g) => {
										const Icono = g.icono;
										return (
											<div key={g.id} className={s.navGroup}>
												<span className={s.navGroupTitle}>
													<span className={s.navGroupLabel}>
														<Icono size={15} aria-hidden />
														{g.label}
													</span>
												</span>
												{g.secciones.map((sec) => {
													const n = conteo(sec);
													return (
														<button
															key={sec}
															type='button'
															className={`${s.navItem} ${seccion === sec ? s.navItemActive : ''} ${n === 0 ? s.navItemEmpty : ''}`}
															onClick={() => navegar(sec)}
															aria-current={seccion === sec ? 'page' : undefined}
														>
															<span>{ETIQUETAS[sec]}</span>
															{n !== null ? <span className={s.navCount}>{fmtNumero(n)}</span> : null}
														</button>
													);
												})}
											</div>
										);
									})}
								</nav>

								<div className={s.main}>
									<section aria-labelledby='rend-seccion'>
										<div className={s.sectionHead}>
											<div>
												<span className={s.sectionGroup}>{GRUPOS.find((g) => g.secciones.includes(seccion))?.label}</span>
												<h3 id='rend-seccion' className={s.sectionTitle}>
													{ETIQUETAS[seccion]}
												</h3>
											</div>
											{conteo(seccion) !== null ? <span className={s.countPill}>{fmtNumero(conteo(seccion))}</span> : null}
										</div>

										{seccion === 'datos' && borrador ? (
											<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
												{detalle.diferencias.length ? (
													<p className={c.warning}>
														Los totales grabados en la cabecera no coinciden con la suma de sus prestaciones (
														{detalle.diferencias.join(', ')}). Lo corrige el sistema de escritorio al volver a rendir.
													</p>
												) : null}
												<RendicionCabeceraForm
													valor={borrador}
													onChange={setBorrador}
													catalogos={catalogos}
													disabled={!editable || guardando}
													soloObservaciones={detalle.detalle.lineas > 0}
												/>
												{errorDatos ? (
													<p className={c.error} role='alert'>
														{errorDatos}
													</p>
												) : null}
												{editable || (permisos.eliminar && detalle.vacia) ? (
													<div className={c.footer}>
														{permisos.eliminar && detalle.vacia ? (
															<button
																type='button'
																className={c.btnDanger}
																onClick={() => setConfirmarBorrado(true)}
																style={{ marginRight: 'auto' }}
															>
																<Trash2 size={15} aria-hidden />
																Borrar rendición vacía
															</button>
														) : null}
														{sucio ? <span className={c.pendientes}>Cambios sin guardar</span> : null}
														{editable ? (
															<>
																<button
																	type='button'
																	className={c.btnGhost}
																	onClick={() => setBorrador(datosDe(detalle))}
																	disabled={!sucio || guardando}
																>
																	Descartar
																</button>
																<button type='button' className={c.btnPrimary} onClick={guardar} disabled={!sucio || guardando}>
																	<Save size={15} aria-hidden />
																	{guardando ? 'Guardando…' : 'Guardar'}
																</button>
															</>
														) : null}
													</div>
												) : null}
												{detalle.estado === 'cerrada' ? (
													<p className={c.info}>
														Cerrada el {fmtFecha(detalle.cierre?.fecha) || '—'}
														{detalle.cierre?.hora ? ` a las ${detalle.cierre.hora.slice(0, 5)}` : ''}: no se puede modificar.
													</p>
												) : null}
												<h4 className={c.seccionTitulo}>Totales</h4>
												<TotalesRendicion r={detalle} />
												{detalle.detalle.lineasSinValor ? (
													<p className={c.subtexto}>
														{fmtNumero(detalle.detalle.lineasSinValor)} prestaciones quedaron en $ 0 (sin regla en el convenio o sin
														valor cargado).
													</p>
												) : null}
											</div>
										) : null}

										{seccion === 'pacientes' ? <SeccionPacientes id={detalle.id} /> : null}

										{seccion === 'prestaciones' ? <SeccionPrestaciones id={detalle.id} catalogos={catalogos} /> : null}

										{seccion === 'facturas' ? <SeccionFacturas id={detalle.id} /> : null}
									</section>
								</div>
							</div>
						</div>
					)}
				</div>
			</Modal>

			<ConfirmDialog
				open={salirSinGuardar !== null}
				title='Cambios sin guardar'
				message='Tenés cambios sin guardar en los datos de la rendición. Si seguís se pierden.'
				confirmLabel='Descartar y seguir'
				tone='danger'
				onCancel={() => setSalirSinGuardar(null)}
				onConfirm={() => {
					const d = salirSinGuardar;
					setSalirSinGuardar(null);
					if (d) irA(d);
				}}
			/>
			<ConfirmDialog
				open={confirmarBorrado}
				title='Borrar rendición'
				message={`Se va a borrar la rendición #${detalle?.id ?? ''}. Está vacía: no tiene prestaciones, facturas ni liquidaciones.`}
				confirmLabel='Borrar'
				tone='danger'
				busy={borrando}
				onCancel={() => setConfirmarBorrado(false)}
				onConfirm={borrar}
			/>
		</>
	);
}
