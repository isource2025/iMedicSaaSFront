'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	agendaService,
	type CierreHciPayload,
	type CierreTurnoPayload,
	type CierreTurnoResult,
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
	cobertura?: string | null;
}

interface Props {
	open: boolean;
	matricula: number;
	turno: TurnoMin | null;
	onClose: () => void;
	onCerrado: (result: CierreTurnoResult) => void;
}

const HCI_INICIAL: CierreHciPayload = {
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
	const [diagSel, setDiagSel] = useState<DiagnosticoCie10 | null>(null);
	const [diagQuery, setDiagQuery] = useState('');
	const [diagResults, setDiagResults] = useState<DiagnosticoCie10[]>([]);
	const [diagLoading, setDiagLoading] = useState(false);
	const [hci, setHci] = useState<CierreHciPayload>(HCI_INICIAL);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setDiagSel(null);
		setDiagQuery('');
		setDiagResults([]);
		setHci({ ...HCI_INICIAL });
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

	const setHciField = useCallback(
		<K extends keyof CierreHciPayload>(k: K, v: CierreHciPayload[K]) => {
			setHci((prev) => ({ ...prev, [k]: v }));
		},
		[],
	);

	const puedeConfirmar = Boolean(diagSel?.codigo?.trim());

	const handleSubmit = useCallback(async () => {
		if (!turno || !diagSel) return;
		setSubmitting(true);
		setError(null);
		try {
			const payload: CierreTurnoPayload = {
				diagnostico: diagSel.codigo.trim(),
				hci: {
					motivoConsulta: turno.observaciones?.trim() || undefined,
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
	}, [turno, matricula, diagSel, hci, onCerrado]);

	const cabecera = useMemo(() => {
		if (!turno) return '';
		const cobertura =
			turno.cobertura?.trim() || 'Obra social del paciente';
		const partes = [
			turno.pacienteNombre || 'Paciente',
			turno.numeroDocumento ? `DNI ${turno.numeroDocumento}` : null,
			turno.sector ? `Sector ${turno.sector}` : null,
			turno.fecha ? `${turno.fecha}${turno.hora ? ` ${turno.hora}` : ''}` : turno.hora || null,
			`Cobertura: ${cobertura}`,
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

				<div className={styles.body}>
					<section className={styles.sectionBlock} aria-labelledby='cerrar-diag-title'>
						<h3 id='cerrar-diag-title' className={styles.sectionTitle}>
							Diagnóstico CIE-10 <span className={styles.required}>*</span>
						</h3>
						<div className={styles.field}>
							<input
								type='search'
								placeholder='Buscar por código u descripción…'
								value={
									diagSel ? `${diagSel.codigo} — ${diagSel.descripcion}` : diagQuery
								}
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
							{!diagSel && (
								<p className={styles.hint}>Seleccioná un diagnóstico para poder cerrar el turno.</p>
							)}
						</div>

					</section>

					<section className={styles.sectionBlock} aria-labelledby='cerrar-signos-title'>
						<h3 id='cerrar-signos-title' className={styles.sectionTitle}>
							Signos vitales
						</h3>
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

					</section>

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
						disabled={submitting || !puedeConfirmar}
						title={!puedeConfirmar ? 'Seleccioná un diagnóstico' : undefined}
					>
						{submitting ? 'Cerrando…' : 'Cerrar turno'}
					</button>
				</footer>
			</div>
		</div>
	);
}
