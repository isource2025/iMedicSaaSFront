'use client';

import { useEffect, useState } from 'react';
import ConfirmDialog from '@/app/components/Agenda/ConfirmDialog';
import Modal from '@/app/components/UI/Modal';
import InfoHint from '@/app/components/UI/InfoHint';
import { useToast } from '@/app/components/UI/ToastProvider';
import { conveniosService } from '@/app/services/conveniosService';
import { mensajeDeError } from '@/app/utils/apiError';
import type { CatalogosConvenio, ConvenioDetalle, ParametrosAjuste, PestanaId, PreviaAjuste } from '@/app/types/convenios';
import { fmtImporte, fmtNumero } from '@/app/components/Facturacion/formato';
import c from '@/app/components/Facturacion/Facturacion.module.css';

interface Props {
	open: boolean;
	convenio: ConvenioDetalle;
	catalogos: CatalogosConvenio;
	onClose: () => void;
	onAplicado: () => void;
}

export default function ConvenioAjusteModal({ open, convenio, catalogos, onClose, onAplicado }: Props) {
	const toast = useToast();
	const [porcentaje, setPorcentaje] = useState('');
	const [pestanas, setPestanas] = useState<PestanaId[]>(catalogos.pestanas.map((p) => p.id));
	const [funcion, setFuncion] = useState('');
	const [desde, setDesde] = useState('');
	const [hasta, setHasta] = useState('');
	const [previa, setPrevia] = useState<PreviaAjuste | null>(null);
	const [calculando, setCalculando] = useState(false);
	const [aplicando, setAplicando] = useState(false);
	const [confirmar, setConfirmar] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setPorcentaje('');
		setPestanas(catalogos.pestanas.map((p) => p.id));
		setFuncion('');
		setDesde('');
		setHasta('');
		setPrevia(null);
		setError(null);
	}, [open, catalogos]);

	useEffect(() => setPrevia(null), [porcentaje, pestanas, funcion, desde, hasta]);

	const conFiltros = funcion !== '' || desde !== '' || hasta !== '';
	const params = (): ParametrosAjuste => ({
		porcentaje,
		pestanas,
		funcion: funcion === '' ? null : Number(funcion),
		desde: desde === '' ? null : Number(desde),
		hasta: hasta === '' ? null : Number(hasta),
	});

	const calcular = async (): Promise<PreviaAjuste | null> => {
		setCalculando(true);
		setError(null);
		try {
			const r = await conveniosService.previsualizarAjuste(convenio.codigo, params());
			setPrevia(r);
			return r;
		} catch (e) {
			setError(mensajeDeError(e, 'No se pudo calcular el ajuste'));
			return null;
		} finally {
			setCalculando(false);
		}
	};

	const pedirAplicar = async () => {
		const r = previa ?? (await calcular());
		if (!r) return;
		const filas = r.pestanas.reduce((a, p) => a + p.filas, 0);
		if (!filas) {
			setError('No hay valores fijos para ajustar con estos filtros.');
			return;
		}
		if (r.pestanas.some((p) => p.desbordan > 0)) return;
		setConfirmar(true);
	};

	const aplicar = async () => {
		setAplicando(true);
		setError(null);
		try {
			const r = await conveniosService.aplicarAjuste(convenio.codigo, params());
			const total = r.pestanas.reduce((a, p) => a + p.filas, 0);
			toast.success(`Ajuste de ${r.porcentaje}% aplicado a ${total.toLocaleString('es-AR')} filas.`);
			setConfirmar(false);
			onAplicado();
			onClose();
		} catch (e) {
			setConfirmar(false);
			setError(mensajeDeError(e, 'No se pudo aplicar el ajuste'));
		} finally {
			setAplicando(false);
		}
	};

	const filasAfectadas = previa?.pestanas.reduce((a, p) => a + p.filas, 0) ?? 0;
	const desbordes = previa?.pestanas.reduce((a, p) => a + p.desbordan, 0) ?? 0;
	const pct = Number(String(porcentaje).replace(',', '.'));
	const listo = !calculando && porcentaje.trim() !== '' && pestanas.length > 0;

	return (
		<Modal isOpen={open} onClose={onClose} title={`Ajuste por porcentaje · Convenio #${convenio.codigo}`} size='large'>
			<div className={c.modalBody}>
				<p className={c.info}>
					Multiplica los valores fijos ($) del convenio por el porcentaje indicado y redondea a 2 decimales. Las filas con valor en % o
					calculado no se tocan.
				</p>
				<section className={c.formBloque}>
					<div className={c.formGrid}>
						<div className={c.campo}>
							<label htmlFor='aj-pct'>Porcentaje</label>
							<input
								id='aj-pct'
								className={c.input}
								inputMode='decimal'
								value={porcentaje}
								onChange={(e) => setPorcentaje(e.target.value)}
								placeholder='Ej.: 12,5 (o -5 para bajar)'
								autoFocus
							/>
						</div>
						<div className={c.campo}>
							<label htmlFor='aj-fun'>
								Función
								<InfoHint label='filtro por función' text='Si filtrás por función o por rango de prácticas, el ajuste solo se aplica a Nomenclador y Moduladas.' />
							</label>
							<select id='aj-fun' className={c.select} value={funcion} onChange={(e) => setFuncion(e.target.value)}>
								<option value=''>Todas</option>
								{catalogos.funciones.map((f) => (
									<option key={f.valor} value={f.valor}>
										{f.descripcion}
									</option>
								))}
							</select>
						</div>
						<div className={c.campo}>
							<span className={c.campoLabel}>Prácticas desde / hasta</span>
							<div style={{ display: 'flex', gap: 6 }}>
								<input className={c.input} inputMode='numeric' value={desde} onChange={(e) => setDesde(e.target.value)} placeholder='Desde' aria-label='Práctica desde' />
								<input className={c.input} inputMode='numeric' value={hasta} onChange={(e) => setHasta(e.target.value)} placeholder='Hasta' aria-label='Práctica hasta' />
							</div>
						</div>
						<div className={`${c.campo} ${c.span3}`}>
							<span className={c.campoLabel}>Pestañas</span>
							<div className={c.listaChecks}>
								{catalogos.pestanas.map((p) => {
									const noAplica = conFiltros && !p.filtroFuncion;
									return (
										<label key={p.id} className={c.check} style={noAplica ? { opacity: 0.5 } : undefined}>
											<input
												type='checkbox'
												checked={pestanas.includes(p.id)}
												onChange={(e) =>
													setPestanas((prev) => (e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id)))
												}
											/>
											{p.titulo}{' '}
											<span className={c.subtexto}>
												({fmtNumero(convenio.conteos[p.id])}){noAplica ? ' · no aplica con filtros' : ''}
											</span>
										</label>
									);
								})}
							</div>
						</div>
					</div>
				</section>

				{error ? <p className={c.error}>{error}</p> : null}

				{previa ? (
					<div className={c.tableWrap}>
						<table className={c.table}>
							<thead>
								<tr>
									<th>Pestaña</th>
									<th className={c.num}>Filas a ajustar</th>
									<th>Ejemplos (valor principal)</th>
								</tr>
							</thead>
							<tbody>
								{previa.pestanas.map((p) => (
									<tr key={p.pestana}>
										<td>{p.titulo}</td>
										<td className={c.num}>
											{p.aplica ? fmtNumero(p.filas) : <span className={c.subtexto}>No aplica con estos filtros</span>}
											{p.desbordan ? <span className={`${c.badge} ${c.badge_vencido}`} style={{ marginLeft: 6 }}>{p.desbordan} fuera de rango</span> : null}
										</td>
										<td>
											{p.muestra.length
												? p.muestra.map((m) => (
														<div key={m.referencia + m.antes} className={c.muestra}>
															<strong>{m.referencia}</strong>: {fmtImporte(m.antes)}
															<span className={c.flecha}>→</span>
															<span className={m.despues >= m.antes ? c.subir : c.bajar}>{fmtImporte(m.despues)}</span>
														</div>
												  ))
												: '—'}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}

				{previa && desbordes ? (
					<p className={c.warning}>Hay valores que quedarían fuera del rango que admite la base. Bajá el porcentaje o acotá el ajuste.</p>
				) : null}

				<div className={c.footer}>
					<span className={c.footerInfo}>
						{previa
							? `${fmtNumero(filasAfectadas)} filas se van a modificar.`
							: !porcentaje.trim()
								? 'Indicá el porcentaje a aplicar.'
								: !pestanas.length
									? 'Elegí al menos una pestaña.'
									: 'Podés revisar la vista previa antes de aplicar.'}
					</span>
					<button type='button' className={c.btnGhost} onClick={onClose}>
						Cancelar
					</button>
					<button type='button' className={c.btnGhost} onClick={() => void calcular()} disabled={!listo}>
						{calculando ? 'Calculando…' : 'Vista previa'}
					</button>
					<button type='button' className={c.btnPrimary} onClick={() => void pedirAplicar()} disabled={!listo || desbordes > 0 || aplicando}>
						{aplicando ? 'Aplicando…' : 'Aplicar ajuste'}
					</button>
				</div>
			</div>
			<ConfirmDialog
				open={confirmar}
				title='Aplicar ajuste'
				message={`Se van a ${pct >= 0 ? 'aumentar' : 'bajar'} ${fmtNumero(filasAfectadas)} valores un ${fmtNumero(Math.abs(pct))}% en "${convenio.descripcion}". No se puede deshacer automáticamente.`}
				confirmLabel='Aplicar'
				busy={aplicando}
				onCancel={() => setConfirmar(false)}
				onConfirm={aplicar}
			/>
		</Modal>
	);
}
