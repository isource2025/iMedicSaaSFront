'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	agendaService,
	type CierreHciPayload,
	type CierreTurnoPayload,
	type CierreTurnoResult,
	type ClienteCobertura,
	type DiagnosticoCie10,
} from '@/app/services/agendaService';
import styles from './CerrarTurnoModal.module.css';

interface TurnoMin {
	idTurno: number;
	pacienteNombre?: string | null;
	numeroDocumento?: number | string | null;
	sector?: string | null;
	hora?: string | null;
	fecha?: string | null;
	observaciones?: string | null;
}

interface Props {
	open: boolean;
	matricula: number;
	turno: TurnoMin | null;
	onClose: () => void;
	onCerrado: (result: CierreTurnoResult) => void;
}

type Tab = 'datos' | 'hci' | 'examen';

const HCI_INICIAL: CierreHciPayload = {
	motivoConsulta: '',
	enfermedadActual: '',
	semiologia: '',
	pa: '',
	fc: '',
	fr: '',
	tax: '',
	glucemia: '',
	talla: '',
	peso: '',
	impresionGeneral: '',
};

export default function CerrarTurnoModal({
	open,
	matricula,
	turno,
	onClose,
	onCerrado,
}: Props) {
	const [tab, setTab] = useState<Tab>('datos');
	const [diagSel, setDiagSel] = useState<DiagnosticoCie10 | null>(null);
	const [diagQuery, setDiagQuery] = useState('');
	const [diagResults, setDiagResults] = useState<DiagnosticoCie10[]>([]);
	const [diagLoading, setDiagLoading] = useState(false);
	const [cobSel, setCobSel] = useState<ClienteCobertura | null>(null);
	const [cobQuery, setCobQuery] = useState('');
	const [cobResults, setCobResults] = useState<ClienteCobertura[]>([]);
	const [cobLoading, setCobLoading] = useState(false);
	const [hci, setHci] = useState<CierreHciPayload>(HCI_INICIAL);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setTab('datos');
		setDiagSel(null);
		setDiagQuery('');
		setDiagResults([]);
		setCobSel(null);
		setCobQuery('');
		setCobResults([]);
		setHci({ ...HCI_INICIAL, motivoConsulta: turno?.observaciones || '' });
		setError(null);
		setSubmitting(false);
	}, [open, turno]);

	useEffect(() => {
		if (!open) return;
		const t = diagQuery.trim();
		if (t.length < 2) {
			setDiagResults([]);
			return;
		}
		const handler = setTimeout(async () => {
			setDiagLoading(true);
			try {
				const res = await agendaService.buscarDiagnosticos(t, 25);
				setDiagResults(res);
			} catch {
				setDiagResults([]);
			} finally {
				setDiagLoading(false);
			}
		}, 250);
		return () => clearTimeout(handler);
	}, [diagQuery, open]);

	useEffect(() => {
		if (!open) return;
		const t = cobQuery.trim();
		const handler = setTimeout(async () => {
			setCobLoading(true);
			try {
				const res = await agendaService.buscarClientes(t, 25);
				setCobResults(res);
			} catch {
				setCobResults([]);
			} finally {
				setCobLoading(false);
			}
		}, 250);
		return () => clearTimeout(handler);
	}, [cobQuery, open]);

	const setHciField = useCallback(
		<K extends keyof CierreHciPayload>(k: K, v: CierreHciPayload[K]) => {
			setHci((prev) => ({ ...prev, [k]: v }));
		},
		[],
	);

	const handleSubmit = useCallback(async () => {
		if (!turno) return;
		setSubmitting(true);
		setError(null);
		try {
			const payload: CierreTurnoPayload = {
				diagnostico: diagSel?.codigo || undefined,
				contrato: cobSel?.valor || undefined,
				hci: {
					motivoConsulta: hci.motivoConsulta?.trim() || undefined,
					enfermedadActual: hci.enfermedadActual?.trim() || undefined,
					semiologia: hci.semiologia?.trim() || undefined,
					pa: hci.pa?.trim() || undefined,
					fc: hci.fc?.trim() || undefined,
					fr: hci.fr?.trim() || undefined,
					tax: hci.tax?.trim() || undefined,
					glucemia: hci.glucemia?.trim() || undefined,
					talla: hci.talla?.trim() || undefined,
					peso: hci.peso?.trim() || undefined,
					impresionGeneral: hci.impresionGeneral?.trim() || undefined,
				},
			};
			const result = await agendaService.cerrarTurno(matricula, turno.idTurno, payload);
			onCerrado(result);
		} catch (e: unknown) {
			const err = e as { response?: { data?: { mensaje?: string } }; message?: string };
			setError(err?.response?.data?.mensaje || err?.message || 'Error al cerrar turno');
		} finally {
			setSubmitting(false);
		}
	}, [turno, matricula, diagSel, cobSel, hci, onCerrado]);

	const cabecera = useMemo(() => {
		if (!turno) return '';
		const partes = [
			turno.pacienteNombre || 'Paciente',
			turno.numeroDocumento ? `DNI ${turno.numeroDocumento}` : null,
			turno.sector ? `Sector ${turno.sector}` : null,
			turno.fecha ? `${turno.fecha}${turno.hora ? ` ${turno.hora}` : ''}` : turno.hora || null,
		].filter(Boolean);
		return partes.join(' · ');
	}, [turno]);

	if (!open || !turno) return null;

	return (
		<div className={styles.overlay} role='dialog' aria-modal>
			<div className={styles.modal}>
				<header className={styles.header}>
					<div>
						<h2 className={styles.title}>Cerrar turno</h2>
						<p className={styles.subtitle}>{cabecera}</p>
					</div>
					<button
						type='button'
						className={styles.closeBtn}
						onClick={onClose}
						disabled={submitting}
						aria-label='Cerrar'
					>
						×
					</button>
				</header>

				<nav className={styles.tabs}>
					<button
						type='button'
						className={`${styles.tab} ${tab === 'datos' ? styles.tabActive : ''}`}
						onClick={() => setTab('datos')}
					>
						Datos de cierre
					</button>
					<button
						type='button'
						className={`${styles.tab} ${tab === 'hci' ? styles.tabActive : ''}`}
						onClick={() => setTab('hci')}
					>
						Motivo / Enf. actual
					</button>
					<button
						type='button'
						className={`${styles.tab} ${tab === 'examen' ? styles.tabActive : ''}`}
						onClick={() => setTab('examen')}
					>
						Signos vitales
					</button>
				</nav>

				<div className={styles.body}>
					{tab === 'datos' && (
						<div className={styles.section}>
							<div className={styles.field}>
								<label>Diagnóstico CIE-10</label>
								<input
									type='search'
									placeholder='Buscar por código u descripción…'
									value={diagSel ? `${diagSel.codigo} — ${diagSel.descripcion}` : diagQuery}
									onChange={(e) => {
										setDiagSel(null);
										setDiagQuery(e.target.value);
									}}
								/>
								{!diagSel && diagQuery.trim().length >= 2 && (
									<div className={styles.results}>
										{diagLoading ? (
											<div className={styles.empty}>Buscando…</div>
										) : diagResults.length === 0 ? (
											<div className={styles.empty}>Sin resultados</div>
										) : (
											diagResults.map((d) => (
												<button
													type='button'
													key={d.valor}
													className={styles.resultRow}
													onClick={() => {
														setDiagSel(d);
														setDiagQuery('');
														setDiagResults([]);
													}}
												>
													<span className={styles.code}>{d.codigo}</span>
													<span className={styles.desc}>{d.descripcion}</span>
												</button>
											))
										)}
									</div>
								)}
							</div>

							<div className={styles.field}>
								<label>Cobertura (CONTRATO)</label>
								<input
									type='search'
									placeholder='Buscar obra social / cliente…'
									value={cobSel ? `${cobSel.razonSocial}` : cobQuery}
									onChange={(e) => {
										setCobSel(null);
										setCobQuery(e.target.value);
									}}
									onFocus={() => {
										if (!cobSel && cobResults.length === 0) {
											setCobQuery('');
										}
									}}
								/>
								{!cobSel && (
									<div className={styles.results}>
										{cobLoading ? (
											<div className={styles.empty}>Buscando…</div>
										) : cobResults.length === 0 ? (
											<div className={styles.empty}>
												{cobQuery.length === 0
													? 'Escribí para buscar coberturas'
													: 'Sin resultados'}
											</div>
										) : (
											cobResults.map((c) => (
												<button
													type='button'
													key={c.valor}
													className={styles.resultRow}
													onClick={() => {
														setCobSel(c);
														setCobQuery('');
														setCobResults([]);
													}}
												>
													<span className={styles.code}>{c.valor}</span>
													<span className={styles.desc}>{c.razonSocial}</span>
												</button>
											))
										)}
									</div>
								)}
							</div>

							<p className={styles.help}>
								Al confirmar se genera la visita ambulatoria, se cargan honorarios de
								consulta y se asocian controles RAC al cierre.
							</p>
						</div>
					)}

					{tab === 'hci' && (
						<div className={styles.section}>
							<div className={styles.field}>
								<label>Motivo de consulta</label>
								<textarea
									rows={3}
									maxLength={500}
									value={hci.motivoConsulta || ''}
									onChange={(e) => setHciField('motivoConsulta', e.target.value)}
								/>
							</div>
							<div className={styles.field}>
								<label>Enfermedad actual</label>
								<textarea
									rows={6}
									maxLength={8000}
									value={hci.enfermedadActual || ''}
									onChange={(e) => setHciField('enfermedadActual', e.target.value)}
								/>
							</div>
							<div className={styles.field}>
								<label>Semiología</label>
								<textarea
									rows={3}
									maxLength={255}
									value={hci.semiologia || ''}
									onChange={(e) => setHciField('semiologia', e.target.value)}
								/>
							</div>
						</div>
					)}

					{tab === 'examen' && (
						<div className={styles.section}>
							<div className={styles.grid}>
								<div className={styles.field}>
									<label>T.A.</label>
									<input
										type='text'
										maxLength={20}
										placeholder='120/80'
										value={hci.pa || ''}
										onChange={(e) => setHciField('pa', e.target.value)}
									/>
								</div>
								<div className={styles.field}>
									<label>F.C.</label>
									<input
										type='text'
										maxLength={20}
										placeholder='80 lpm'
										value={hci.fc || ''}
										onChange={(e) => setHciField('fc', e.target.value)}
									/>
								</div>
								<div className={styles.field}>
									<label>F.R.</label>
									<input
										type='text'
										maxLength={20}
										placeholder='16 rpm'
										value={hci.fr || ''}
										onChange={(e) => setHciField('fr', e.target.value)}
									/>
								</div>
								<div className={styles.field}>
									<label>T.°C</label>
									<input
										type='text'
										maxLength={20}
										placeholder='36.5'
										value={hci.tax || ''}
										onChange={(e) => setHciField('tax', e.target.value)}
									/>
								</div>
								<div className={styles.field}>
									<label>Glucemia</label>
									<input
										type='text'
										maxLength={20}
										placeholder='mg/dL'
										value={hci.glucemia || ''}
										onChange={(e) => setHciField('glucemia', e.target.value)}
									/>
								</div>
								<div className={styles.field}>
									<label>Talla</label>
									<input
										type='text'
										maxLength={20}
										placeholder='cm'
										value={hci.talla || ''}
										onChange={(e) => setHciField('talla', e.target.value)}
									/>
								</div>
								<div className={styles.field}>
									<label>Peso</label>
									<input
										type='text'
										maxLength={20}
										placeholder='kg'
										value={hci.peso || ''}
										onChange={(e) => setHciField('peso', e.target.value)}
									/>
								</div>
							</div>
							<div className={styles.field}>
								<label>Impresión general</label>
								<textarea
									rows={3}
									maxLength={200}
									value={hci.impresionGeneral || ''}
									onChange={(e) => setHciField('impresionGeneral', e.target.value)}
								/>
							</div>
						</div>
					)}

					{error && <div className={styles.error}>{error}</div>}
				</div>

				<footer className={styles.footer}>
					<button
						type='button'
						className={styles.btnSecondary}
						onClick={onClose}
						disabled={submitting}
					>
						Cancelar
					</button>
					<button
						type='button'
						className={styles.btnPrimary}
						onClick={handleSubmit}
						disabled={submitting}
					>
						{submitting ? 'Cerrando…' : 'Cerrar turno'}
					</button>
				</footer>
			</div>
		</div>
	);
}
