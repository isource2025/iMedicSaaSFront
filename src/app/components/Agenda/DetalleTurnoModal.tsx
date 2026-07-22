'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	agendaService,
	type DetalleAtencionTurno,
	type ControlFrecuenteTurno,
} from '@/app/services/agendaService';
import { adjuntosService } from '@/app/services/adjuntosService';
import AdjuntoFileViewer, {
	type AdjuntoViewerState,
} from '@/app/components/beds/adjuntos/AdjuntoFileViewer';
import { useModalLayer } from '@/app/hooks/useModalLayer';
import { formatIMC } from '@/app/utils/antropometria';
import Loader from '../Loader/Loader';
import styles from './DetalleTurnoModal.module.css';

const TRIAGE_LABELS: Record<number, string> = {
	1: 'Emergencia',
	2: 'Muy urgente',
	3: 'Urgente',
	4: 'Normal',
	5: 'No urgente',
};

interface Props {
	open: boolean;
	idTurno: number | null;
	onClose: () => void;
	onEditar?: (idTurno: number) => void;
}

function val(v: unknown, fallback = '—'): string {
	if (v === undefined || v === null || v === '') return fallback;
	return String(v);
}

function num(v: unknown): string {
	if (v === undefined || v === null || v === '') return '—';
	return String(v);
}

function fmtFecha(iso?: string | null): string {
	if (!iso) return '—';
	const d = iso.slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return iso;
	const [y, m, day] = d.split('-');
	return `${day}/${m}/${y}`;
}

export default function DetalleTurnoModal({ open, idTurno, onClose, onEditar }: Props) {
	const mounted = useModalLayer(open);
	const [data, setData] = useState<DetalleAtencionTurno | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [viewer, setViewer] = useState<AdjuntoViewerState | null>(null);
	const [viewerLoading, setViewerLoading] = useState(false);

	useEffect(() => {
		if (!open || !idTurno) {
			setData(null);
			setError(null);
			return;
		}
		let cancel = false;
		setLoading(true);
		setError(null);
		agendaService
			.getDetalleAtencionTurno(idTurno)
			.then((d) => {
				if (!cancel) setData(d);
			})
			.catch((e: unknown) => {
				if (!cancel) {
					const err = e as { response?: { data?: { mensaje?: string } }; message?: string };
					setError(
						err?.response?.data?.mensaje ||
							err?.message ||
							'No se pudo cargar el detalle',
					);
				}
			})
			.finally(() => !cancel && setLoading(false));
		return () => {
			cancel = true;
		};
	}, [open, idTurno]);

	useEffect(() => {
		if (!open) {
			adjuntosService.revocarBlobUrl(viewer?.blobUrl);
			setViewer(null);
			setViewerLoading(false);
		}
	}, [open, viewer?.blobUrl]);

	if (!open || !idTurno || !mounted) return null;

	const t = data?.turno;
	const p = data?.paciente;
	const racControles = data?.rac?.controles ?? [];
	const racMedicacion = data?.rac?.medicacion ?? [];
	const adjuntos = data?.adjuntos ?? [];
	const procedimientosRealizados = data?.procedimientosRealizados ?? [];
	const pedidosEstudios = data?.pedidosEstudios ?? [];
	const triageLbl =
		t?.idClasificacionTriage != null
			? `${t.idClasificacionTriage} · ${TRIAGE_LABELS[t.idClasificacionTriage] || '—'}`
			: '—';

	const abrirAdjunto = async (idAdjunto: number, nombreArchivo: string) => {
		if (viewerLoading) return;
		setViewerLoading(true);
		try {
			const { blob, blobUrl } = await adjuntosService.cargarBlobAdjunto(idAdjunto);
			adjuntosService.revocarBlobUrl(viewer?.blobUrl);
			setViewer({
				blobUrl,
				fileName: nombreArchivo,
				mimeType: blob.type || '',
			});
		} catch (e: unknown) {
			const err = e as { message?: string };
			setError(err?.message || 'No se pudo abrir el adjunto');
		} finally {
			setViewerLoading(false);
		}
	};

	const closeViewer = () => {
		adjuntosService.revocarBlobUrl(viewer?.blobUrl);
		setViewer(null);
	};

	const modal = (
		<div className={styles.overlay}>
			<div
				className={styles.modal}
				role='dialog'
				aria-modal='true'
				aria-label='Detalle de atención del turno'
			>
				<header className={styles.header}>
					<div>
						<h2 className={styles.title}>Detalle de la atención</h2>
						<p className={styles.subtitle}>
							{p?.nombre || 'Paciente'} · Turno #{idTurno}
							{t?.fecha ? ` · ${fmtFecha(t.fecha)} ${t.hora || ''}` : ''}
						</p>
					</div>
					<button type='button' className={styles.closeBtn} onClick={onClose} aria-label='Cerrar'>
						×
					</button>
				</header>

				<div className={styles.body}>
					{loading ? <Loader /> : null}
					{error ? <div className={styles.error}>{error}</div> : null}

					{data && !loading ? (
						<>
							<section className={styles.section}>
								<h3 className={styles.sectionTitle}>Paciente y turno</h3>
								<div className={styles.grid}>
									<div className={styles.field}>
										<span className={styles.lbl}>Paciente</span>
										<span className={styles.val}>{val(p?.nombre)}</span>
									</div>
									<div className={styles.field}>
										<span className={styles.lbl}>DNI</span>
										<span className={styles.val}>{val(p?.numeroDocumento)}</span>
									</div>
									<div className={styles.field}>
										<span className={styles.lbl}>Historia clínica</span>
										<span className={styles.val}>{val(p?.numeroHC)}</span>
									</div>
									<div className={styles.field}>
										<span className={styles.lbl}>Cobertura</span>
										<span className={styles.val}>{val(p?.cobertura)}</span>
									</div>
									<div className={styles.field}>
										<span className={styles.lbl}>Sector</span>
										<span className={styles.val}>{val(t?.sector)}</span>
									</div>
									<div className={styles.field}>
										<span className={styles.lbl}>Profesional</span>
										<span className={styles.val}>
											{data.profesional.nombre || data.profesional.matricula || '—'}
										</span>
									</div>
									<div className={styles.field}>
										<span className={styles.lbl}>Nº visita</span>
										<span className={styles.val}>
											{t?.numeroVisita ? String(t.numeroVisita) : '—'}
										</span>
									</div>
									<div className={styles.field}>
										<span className={styles.lbl}>Estado</span>
										<span className={styles.val}>{val(t?.estado)}</span>
									</div>
									{t?.observaciones ? (
										<div className={`${styles.field} ${styles.fieldWide}`}>
											<span className={styles.lbl}>Observaciones agenda</span>
											<span className={styles.val}>{t.observaciones}</span>
										</div>
									) : null}
								</div>
							</section>

							<section className={styles.section}>
								<h3 className={styles.sectionTitle}>Tiempos</h3>
								<div className={styles.grid}>
									<div className={styles.field}>
										<span className={styles.lbl}>Turno</span>
										<span className={styles.val}>{val(t?.hora)}</span>
									</div>
									<div className={styles.field}>
										<span className={styles.lbl}>Llegada</span>
										<span className={styles.val}>{val(t?.horaLlegada)}</span>
									</div>
									<div className={styles.field}>
										<span className={styles.lbl}>Ingreso</span>
										<span className={styles.val}>{val(t?.horaIngreso)}</span>
									</div>
									<div className={styles.field}>
										<span className={styles.lbl}>Cierre</span>
										<span className={styles.val}>{val(t?.horaSalida)}</span>
									</div>
									<div className={styles.field}>
										<span className={styles.lbl}>Triage</span>
										<span className={styles.val}>{triageLbl}</span>
									</div>
								</div>
							</section>

							{data.trazabilidad ? (
								<section className={styles.section}>
									<h3 className={styles.sectionTitle}>Trazabilidad</h3>
									<div className={styles.grid}>
										<div className={styles.field}>
											<span className={styles.lbl}>Turno asignado por</span>
											<span className={styles.val}>
												{data.trazabilidad.asignacion?.nombre || '—'}
												{data.trazabilidad.asignacion?.fecha
													? ` · ${fmtFecha(data.trazabilidad.asignacion.fecha)}`
													: ''}
												{data.trazabilidad.asignacion?.hora
													? ` ${data.trazabilidad.asignacion.hora}`
													: ''}
											</span>
										</div>
										<div className={styles.field}>
											<span className={styles.lbl}>Llegada registrada</span>
											<span className={styles.val}>
												{data.trazabilidad.llegada?.hora || '—'}
												{data.trazabilidad.llegada?.operador
													? ` · ${data.trazabilidad.llegada.operador}`
													: data.trazabilidad.llegada
														? ' · Operador no registrado'
														: ''}
											</span>
										</div>
										<div className={styles.field}>
											<span className={styles.lbl}>Ingreso al consultorio</span>
											<span className={styles.val}>
												{data.trazabilidad.ingreso?.hora || '—'}
												{data.trazabilidad.ingreso?.operador
													? ` · ${data.trazabilidad.ingreso.operador}`
													: data.trazabilidad.ingreso
														? ' · Operador no registrado'
														: ''}
											</span>
										</div>
										<div className={styles.field}>
											<span className={styles.lbl}>Cierre de atención</span>
											<span className={styles.val}>
												{data.trazabilidad.cierre?.hora || '—'}
												{data.trazabilidad.cierre?.operador
													? ` · ${data.trazabilidad.cierre.operador}`
													: data.trazabilidad.cierre
														? ' · Operador no registrado'
														: ''}
											</span>
										</div>
									</div>
								</section>
							) : null}

							{(data.hc || data.diagnostico) && (
								<section className={styles.section}>
									<h3 className={styles.sectionTitle}>Historia clínica al cierre</h3>
									<div className={styles.hcBlock}>
										{data.hc?.motivoConsulta ? (
											<div className={styles.hcItem}>
												<span className={styles.lbl}>Motivo de consulta</span>
												<p className={styles.textBlock}>{data.hc.motivoConsulta}</p>
											</div>
										) : null}
										{data.hc?.enfermedadActual ? (
											<div className={styles.hcItem}>
												<span className={styles.lbl}>Enfermedad actual</span>
												<p className={styles.textBlock}>{data.hc.enfermedadActual}</p>
											</div>
										) : null}
										{data.diagnostico ? (
											<div className={styles.hcItem}>
												<span className={styles.lbl}>Diagnóstico CIE-10</span>
												<p className={styles.textBlock}>
													<strong>{data.diagnostico.codigo}</strong>
													{data.diagnostico.descripcion
														? ` — ${data.diagnostico.descripcion}`
														: ''}
												</p>
											</div>
										) : null}
									</div>
								</section>
							)}

							<section className={styles.section}>
								<h3 className={styles.sectionTitle}>
									Procedimientos realizados ({procedimientosRealizados.length})
								</h3>
								{procedimientosRealizados.length === 0 ? (
									<p className={styles.empty}>
										Sin procedimientos adicionales en consultorio.
									</p>
								) : (
									<div className={styles.tableWrap}>
										<table className={styles.table}>
											<thead>
												<tr>
													<th>Código</th>
													<th>Descripción</th>
													<th>Cant.</th>
													<th>Hora</th>
													<th>Profesional</th>
												</tr>
											</thead>
											<tbody>
												{procedimientosRealizados.map((pr) => (
													<tr key={pr.valor}>
														<td>{pr.codigoPractica}</td>
														<td>{pr.descripcion}</td>
														<td>{pr.cantidad}</td>
														<td>{val(pr.hora)}</td>
														<td>{val(pr.profesional)}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</section>

							<section className={styles.section}>
								<h3 className={styles.sectionTitle}>
									Estudios solicitados ({pedidosEstudios.length})
								</h3>
								{pedidosEstudios.length === 0 ? (
									<p className={styles.empty}>Sin pedidos de estudios.</p>
								) : (
									<div className={styles.tableWrap}>
										<table className={styles.table}>
											<thead>
												<tr>
													<th>Estudio</th>
													<th>Estado</th>
													<th>Sector receptor</th>
													<th>Urgencia</th>
													<th>Fecha pedido</th>
													<th>Observaciones / resultado</th>
												</tr>
											</thead>
											<tbody>
												{pedidosEstudios.map((pe) => (
													<tr key={pe.idPedido}>
														<td>
															<strong>{pe.descripcion}</strong>
															<div className={styles.listMeta}>
																Cód. {pe.codigoPractica}
															</div>
														</td>
														<td>{pe.cumplido ? 'Cumplido' : 'Pendiente'}</td>
														<td>
															{pe.sectorReceptorNombre || pe.sectorReceptor || '—'}
															{pe.sectorReceptorNombre && pe.sectorReceptor
																? ` (${pe.sectorReceptor})`
																: ''}
														</td>
														<td>{val(pe.estadoUrgencia)}</td>
														<td>
															{pe.fechaPedido
																? new Date(pe.fechaPedido).toLocaleString('es-AR', {
																		day: '2-digit',
																		month: '2-digit',
																		year: 'numeric',
																		hour: '2-digit',
																		minute: '2-digit',
																	})
																: '—'}
														</td>
														<td>
															{val(pe.notas, '—')}
															{pe.cumplido && pe.textoResultado ? (
																<div className={styles.listMeta}>
																	Resultado:{' '}
																	{pe.textoResultado.length > 160
																		? `${pe.textoResultado.slice(0, 160)}…`
																		: pe.textoResultado}
																</div>
															) : null}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</section>

							<section className={styles.section}>
								<h3 className={styles.sectionTitle}>
									RAC · Controles ({racControles.length})
								</h3>
								{racControles.length === 0 ? (
									<p className={styles.empty}>Sin controles registrados.</p>
								) : (
									<div className={styles.tableWrap}>
										<table className={styles.table}>
											<thead>
												<tr>
													<th>Fecha</th>
													<th>Hora</th>
													<th>FC</th>
													<th>PA</th>
													<th>FR</th>
													<th>Temp.</th>
													<th>Gluc.</th>
													<th>Sat.</th>
													<th>Peso/IMC</th>
												</tr>
											</thead>
											<tbody>
												{racControles.map((c: ControlFrecuenteTurno, idx) => (
													<tr key={c.Valor ?? idx}>
														<td>{c.FechaControl || '—'}</td>
														<td>{c.HoraControl || '—'}</td>
														<td>{num(c.Pulso)}</td>
														<td>
															{num(c.Maximo)}/{num(c.Minimo)}
														</td>
														<td>{num(c.FrecuenciaRespiratoria)}</td>
														<td>{c.Axilar ?? c.Rectal ?? '—'}</td>
														<td>{c.Hgt && c.Hgt !== '0' ? c.Hgt : '—'}</td>
														<td>
															{c.Saturometria ? `${c.Saturometria}%` : '—'}
														</td>
														<td>{formatIMC(c.Peso, c.Talla, c.IMC)}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</section>

							<section className={styles.section}>
								<h3 className={styles.sectionTitle}>
									RAC · Medicación ({racMedicacion.length})
								</h3>
								{racMedicacion.length === 0 ? (
									<p className={styles.empty}>Sin medicación aplicada.</p>
								) : (
									<div className={styles.tableWrap}>
										<table className={styles.table}>
											<thead>
												<tr>
													<th>Fecha</th>
													<th>Hora</th>
													<th>Medicamento</th>
													<th>Cant.</th>
													<th>Unidad</th>
												</tr>
											</thead>
											<tbody>
												{racMedicacion.map((m, idx) => (
													<tr key={m.IDCtrlMedica ?? idx}>
														<td>{m.FechaControl || '—'}</td>
														<td>{m.HoraControl || '—'}</td>
														<td>
															{m.NombreMedicamento ||
																m.DescripcionMedicamento ||
																m.Troquel ||
																'—'}
														</td>
														<td>{num(m.Cantidad)}</td>
														<td>{val(m.TipoUnidad)}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</section>

							<section className={styles.section}>
								<h3 className={styles.sectionTitle}>Adjuntos ({adjuntos.length})</h3>
								{adjuntos.length === 0 ? (
									<p className={styles.empty}>Sin adjuntos.</p>
								) : (
									<ul className={styles.list}>
										{adjuntos.map((a) => (
											<li key={a.idAdjunto} className={styles.listItem}>
												<button
													type='button'
													className={styles.listBtn}
													disabled={viewerLoading}
													onClick={() =>
														void abrirAdjunto(a.idAdjunto, a.nombreArchivo)
													}
												>
													{a.nombreArchivo}
												</button>
												<span className={styles.listMeta}>
													{a.tipoImagenNombre || a.tipoImagen || '—'}
													{a.fechaCarga
														? ` · ${new Date(a.fechaCarga).toLocaleString('es-AR')}`
														: ''}
												</span>
											</li>
										))}
									</ul>
								)}
							</section>
						</>
					) : null}
				</div>

				<footer className={styles.footer}>
					{data?.edicionPostCierre?.puedeEditar && onEditar && idTurno ? (
						<button
							type='button'
							className={styles.btnPrimary}
							onClick={() => onEditar(idTurno)}
						>
							Editar / agregar (24 h)
						</button>
					) : null}
					<button type='button' className={styles.btnSecondary} onClick={onClose}>
						Cerrar
					</button>
				</footer>
			</div>

			<AdjuntoFileViewer
				viewer={viewer}
				loading={viewerLoading}
				onClose={closeViewer}
			/>
		</div>
	);

	return createPortal(modal, document.body);
}
