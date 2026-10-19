'use client';

import { useCallback, useEffect, useState } from 'react';
import ConfirmDialog from '@/app/components/Agenda/ConfirmDialog';
import Modal from '@/app/components/UI/Modal';
import { useToast } from '@/app/components/UI/ToastProvider';
import { conveniosService } from '@/app/services/conveniosService';
import { mensajeDeError } from '@/app/utils/apiError';
import type { ReporteMantenimiento } from '@/app/types/convenios';
import { fmtNumero } from '@/app/components/Facturacion/formato';
import c from '@/app/components/Facturacion/Facturacion.module.css';

interface Props {
	open: boolean;
	puedeLimpiar: boolean;
	onClose: () => void;
	onAbrirConvenio: (codigo: number) => void;
}

export default function ConveniosMantenimientoModal({ open, puedeLimpiar, onClose, onAbrirConvenio }: Props) {
	const toast = useToast();
	const [reporte, setReporte] = useState<ReporteMantenimiento | null>(null);
	const [cargando, setCargando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [confirmar, setConfirmar] = useState(false);
	const [limpiando, setLimpiando] = useState(false);

	const cargar = useCallback(async () => {
		setCargando(true);
		setError(null);
		try {
			setReporte(await conveniosService.mantenimiento());
		} catch (e) {
			setError(mensajeDeError(e, 'No se pudo revisar la consistencia'));
		} finally {
			setCargando(false);
		}
	}, []);

	useEffect(() => {
		if (open) cargar();
	}, [open, cargar]);

	const totalHuerfanas = reporte ? reporte.huerfanas.reduce((a, h) => a + h.filas, 0) : 0;

	const limpiar = async () => {
		setLimpiando(true);
		try {
			const r = await conveniosService.limpiarHuerfanas();
			const total = Object.entries(r)
				.filter(([k]) => k !== 'practicasXConvenio')
				.reduce((a, [, n]) => a + n, 0);
			toast.success(`Se borraron ${fmtNumero(total)} filas huérfanas y ${fmtNumero(r.practicasXConvenio)} prácticas sincronizadas sin convenio.`);
			setConfirmar(false);
			cargar();
		} catch (e) {
			setConfirmar(false);
			setError(mensajeDeError(e, 'No se pudieron limpiar las filas huérfanas'));
		} finally {
			setLimpiando(false);
		}
	};

	const abrir = (codigo: number) => {
		onClose();
		onAbrirConvenio(codigo);
	};

	return (
		<Modal isOpen={open} onClose={onClose} title='Consistencia de convenios' size='large'>
			<div className={c.modalBody}>
				{cargando && !reporte ? (
					<div className={c.loading}>
						<span className={c.spinner} aria-hidden /> Revisando las tablas de convenios…
					</div>
				) : null}
				{error ? <p className={c.error}>{error}</p> : null}
				{reporte ? (
					<>
						<section className={c.formBloque}>
							<h4 className={c.formBloqueTitulo}>Filas huérfanas</h4>
							<p className={c.subtexto}>
								Filas de detalle cuyo convenio ya no existe. No se usan para facturar; solo ocupan lugar y ensucian los reportes. El
								convenio 0 se excluye a propósito.
							</p>
							<div className={c.tableWrap}>
								<table className={c.table}>
									<thead>
										<tr>
											<th>Pestaña</th>
											<th className={c.num}>Filas</th>
											<th>Convenios inexistentes</th>
										</tr>
									</thead>
									<tbody>
										{reporte.huerfanas.map((h) => (
											<tr key={h.pestana}>
												<td>{h.titulo}</td>
												<td className={`${c.num} ${h.filas ? '' : c.numMuted}`}>{fmtNumero(h.filas)}</td>
												<td className={c.subtexto}>
													{h.convenios.slice(0, 12).map((x) => `#${x.codigo} (${fmtNumero(x.filas)})`).join(', ') || '—'}
													{h.convenios.length > 12 ? ` y ${h.convenios.length - 12} más` : ''}
												</td>
											</tr>
										))}
										<tr>
											<td>Prácticas sincronizadas (imPracticasXConvenios)</td>
											<td className={`${c.num} ${reporte.practicasXConvenioHuerfanas ? '' : c.numMuted}`}>
												{fmtNumero(reporte.practicasXConvenioHuerfanas)}
											</td>
											<td className={c.subtexto}>Se regeneran solas a partir del nomenclador y las moduladas.</td>
										</tr>
									</tbody>
								</table>
							</div>
							{puedeLimpiar ? (
								<div>
									<button
										type='button'
										className={c.btnDanger}
										onClick={() => setConfirmar(true)}
										disabled={!totalHuerfanas && !reporte.practicasXConvenioHuerfanas}
									>
										Borrar filas huérfanas
									</button>
								</div>
							) : (
								<p className={c.subtexto}>Para borrarlas hace falta el permiso de eliminar en Convenios.</p>
							)}
						</section>

						<section className={c.formBloque}>
							<h4 className={c.formBloqueTitulo}>Para revisar a mano</h4>
							<p className={c.subtexto}>Esto no se corrige automáticamente: abrí el convenio y decidí qué fila queda.</p>
							<h5 className={c.seccionTitulo}>Nomenclador con filas repetidas ({reporte.duplicadosNomenclador.length})</h5>
							{reporte.duplicadosNomenclador.length ? (
								<div className={c.tableWrap}>
									<table className={c.table}>
										<thead>
											<tr>
												<th>Convenio</th>
												<th className={c.num}>Grupos repetidos</th>
												<th className={c.num}>Filas de más</th>
											</tr>
										</thead>
										<tbody>
											{reporte.duplicadosNomenclador.map((d) => (
												<tr key={d.codigo}>
													<td>
														<button type='button' className={c.codigoLink} onClick={() => abrir(d.codigo)}>
															#{d.codigo}
														</button>{' '}
														{d.descripcion}
													</td>
													<td className={c.num}>{fmtNumero(d.grupos)}</td>
													<td className={c.num}>{fmtNumero(d.sobrantes)}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : (
								<p className={c.subtexto}>Ninguno.</p>
							)}
							<h5 className={c.seccionTitulo}>Rangos con “Desde” mayor que “Hasta” ({reporte.rangosInvertidos.length})</h5>
							{reporte.rangosInvertidos.length ? (
								<p className={c.subtexto}>
									{reporte.rangosInvertidos.map((r, i) => (
										<span key={`${r.pestana}-${r.codigo}-${r.desde}-${i}`}>
											{i ? ' · ' : ''}
											<button type='button' className={c.codigoLink} onClick={() => abrir(r.codigo)}>
												#{r.codigo}
											</button>{' '}
											{r.pestana === 'moduladas' ? 'Moduladas' : 'Nomenclador'} {r.desde}–{r.hasta}
										</span>
									))}
								</p>
							) : (
								<p className={c.subtexto}>Ninguno.</p>
							)}
							<h5 className={c.seccionTitulo}>Convenios sin ninguna fila ({reporte.conveniosVacios.length})</h5>
							<p className={c.subtexto}>
								{reporte.conveniosVacios.length
									? reporte.conveniosVacios.map((v, i) => (
											<span key={v.codigo}>
												{i ? ' · ' : ''}
												<button type='button' className={c.codigoLink} onClick={() => abrir(v.codigo)}>
													#{v.codigo}
												</button>{' '}
												{v.descripcion}
											</span>
									  ))
									: 'Ninguno.'}
							</p>
						</section>
					</>
				) : null}
				<div className={c.footer}>
					<button type='button' className={c.btnGhost} onClick={cargar} disabled={cargando}>
						{cargando ? 'Revisando…' : 'Volver a revisar'}
					</button>
					<button type='button' className={c.btnPrimary} onClick={onClose}>
						Cerrar
					</button>
				</div>
			</div>
			<ConfirmDialog
				open={confirmar}
				title='Borrar filas huérfanas'
				message={`Se van a borrar ${fmtNumero(totalHuerfanas)} filas de detalle de convenios que ya no existen y ${fmtNumero(reporte?.practicasXConvenioHuerfanas ?? 0)} prácticas sincronizadas. No afecta a ningún convenio existente.`}
				confirmLabel='Borrar'
				tone='danger'
				busy={limpiando}
				onCancel={() => setConfirmar(false)}
				onConfirm={limpiar}
			/>
		</Modal>
	);
}
