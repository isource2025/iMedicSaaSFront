"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles } from 'lucide-react';
import styles from './NuevaEpicrisisModal.module.css';
import { NuevaEpicrisisPayload } from '../../../types/epicrisis';
import { useAppContext } from '@/app/contexts/AppContext';
import { epicrisisService } from '../../../services/epicrisisService';
import { authService } from '../../../services/authService';
import { agendaService, type DiagnosticoCie10 } from '@/app/services/agendaService';
import type { EpicrisisRow } from './EpicrisisTable';

const DISCLAIMER_IA_UI =
	'Esta epicrisis fue elaborada con asistencia de inteligencia artificial a partir de la historia clínica. Al guardar, Ud. confirma haberla revisado y validado. La responsabilidad clínica y legal recae exclusivamente en el profesional firmante; la IA no sustituye el juicio médico.';

interface Props {
	onClose: () => void;
	onSave: (data: NuevaEpicrisisPayload) => Promise<unknown> | unknown;
	defaultIdVisita: number | null;
	documentoPaciente?: string;
	/** Sector de la cama/paciente (no se muestra; se guarda oculto) */
	bedSector?: string;
	idEpicrisis?: number | null;
	/** Fila ya cargada en la tabla: no se vuelve a pedir al servidor. */
	registro?: EpicrisisRow | null;
	refetch?: () => Promise<void>;
}

const getLocalDateString = (date: Date): string => {
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
};

const getLocalTimeString = (date: Date): string => {
	const hh = String(date.getHours()).padStart(2, '0');
	const mm = String(date.getMinutes()).padStart(2, '0');
	return `${hh}:${mm}`;
};

const resolverProfecional = (idPersonalFallback: string): number | undefined => {
	const u = authService.getCurrentUser() as Record<string, unknown> | null;
	const mat = u?.matricula ?? u?.Matricula;
	if (mat != null && Number(mat) > 0) return Number(mat);
	const vp = u?.idValorpersonal ?? u?.valorPersonal;
	if (vp != null && Number(vp) > 0) return Number(vp);
	if (idPersonalFallback) return parseInt(idPersonalFallback, 10);
	return undefined;
};

export default function NuevaEpicrisisModal({
	onClose,
	onSave,
	defaultIdVisita,
	documentoPaciente,
	bedSector,
	idEpicrisis = null,
	registro = null,
	refetch,
}: Props) {
	const { idsector, sectorSeleccionado } = useAppContext();
	const idPersonal = sectorSeleccionado?.idPersonal || '';
	const esEdicion = idEpicrisis != null;
	const sectorEfectivo = String(bedSector || idsector || '').trim();
	const documentoEfectivo = String(documentoPaciente || '').trim();

	const initial = useMemo<NuevaEpicrisisPayload>(
		() => ({
			IdVisita: defaultIdVisita || 0,
			Fecha: getLocalDateString(new Date()),
			Hora: getLocalTimeString(new Date()),
			IdSector: sectorEfectivo,
			Epicrisis: '',
			NumeroDocumento: documentoEfectivo,
			Profecional: resolverProfecional(idPersonal),
			Diagnostico: '',
			DiagnosticoText: '',
			GeneradoConIA: false,
		}),
		[defaultIdVisita, documentoEfectivo, sectorEfectivo, idPersonal],
	);

	const [form, setForm] = useState<NuevaEpicrisisPayload>(initial);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [iaNotice, setIaNotice] = useState<string | null>(null);
	const [generadoConIA, setGeneradoConIA] = useState(false);
	const [showDisclaimerConfirm, setShowDisclaimerConfirm] = useState(false);
	const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

	const [diagTerm, setDiagTerm] = useState('');
	const [diagResults, setDiagResults] = useState<DiagnosticoCie10[]>([]);
	const [diagSel, setDiagSel] = useState<DiagnosticoCie10 | null>(null);
	const [diagLoading, setDiagLoading] = useState(false);
	const diagWrapRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!esEdicion) {
			setForm(initial);
			setGeneradoConIA(false);
			setIaNotice(null);
			setShowDisclaimerConfirm(false);
			setDisclaimerAccepted(false);
			setDiagTerm('');
			setDiagSel(null);
			setDiagResults([]);
			return;
		}
		if (!registro) return;
		const texto = registro.epicrisis || '';
		const yaTieneDisclaimer = texto.includes(
			'DESLINDE DE RESPONSABILIDAD (asistencia por IA)',
		);
		const codigo = String(registro.diagnostico || '').trim();
		const desc = String(registro.diagnosticoText || '').trim();
		setGeneradoConIA(yaTieneDisclaimer);
		setForm({
			IdVisita: registro.idVisita,
			Fecha: String(registro.fecha || '').slice(0, 10),
			Hora: String(registro.hora || '').slice(0, 5),
			IdSector: sectorEfectivo || registro.idSector || '',
			Epicrisis: texto,
			NumeroDocumento: documentoEfectivo || String(registro.numeroDocumento || ''),
			Profecional: registro.profesional ?? resolverProfecional(idPersonal),
			Diagnostico: codigo,
			DiagnosticoText: desc,
			GeneradoConIA: yaTieneDisclaimer,
		});
		if (codigo) {
			setDiagSel({ codigo, descripcion: desc || codigo, valor: 0 });
			setDiagTerm(codigo);
		} else {
			setDiagSel(null);
			setDiagTerm('');
		}
	}, [initial, esEdicion, registro, sectorEfectivo, documentoEfectivo, idPersonal]);

	useEffect(() => {
		if (diagSel) return;
		const t = diagTerm.trim();
		if (t.length < 1) {
			setDiagResults([]);
			return;
		}
		let cancel = false;
		setDiagLoading(true);
		const handle = setTimeout(async () => {
			try {
				const rows = await agendaService.buscarDiagnosticos(t, 25);
				if (!cancel) setDiagResults(rows);
			} catch {
				if (!cancel) setDiagResults([]);
			} finally {
				if (!cancel) setDiagLoading(false);
			}
		}, 250);
		return () => {
			cancel = true;
			clearTimeout(handle);
		};
	}, [diagTerm, diagSel]);

	const set = (field: keyof NuevaEpicrisisPayload, value: unknown) =>
		setForm((prev) => ({ ...prev, [field]: value }));

	const seleccionarDiagnostico = (d: DiagnosticoCie10) => {
		setDiagSel(d);
		setDiagTerm(d.codigo);
		setDiagResults([]);
		setForm((prev) => ({
			...prev,
			Diagnostico: String(d.codigo || '').slice(0, 8),
			DiagnosticoText: d.descripcion || '',
		}));
	};

	const limpiarDiagnostico = () => {
		setDiagSel(null);
		setDiagTerm('');
		setDiagResults([]);
		setForm((prev) => ({ ...prev, Diagnostico: '', DiagnosticoText: '' }));
	};

	const handleGenerarIA = async () => {
		if (!defaultIdVisita) {
			alert('No hay número de visita');
			return;
		}
		setGenerating(true);
		setIaNotice(null);
		try {
			const draft = await epicrisisService.generarConIA(defaultIdVisita);
			const conIA = draft.fuente === 'openai' || draft.generadoConIA === true;
			setGeneradoConIA(conIA);
			const codigo = String(draft.diagnostico || '').trim().slice(0, 8);
			const desc = String(draft.diagnosticoText || '').trim();
			setForm((prev) => ({
				...prev,
				Epicrisis: draft.epicrisis || prev.Epicrisis,
				Diagnostico: codigo || prev.Diagnostico,
				DiagnosticoText: desc || prev.DiagnosticoText,
				GeneradoConIA: conIA,
				IdSector: sectorEfectivo || prev.IdSector,
				NumeroDocumento: documentoEfectivo || prev.NumeroDocumento,
			}));
			if (codigo) {
				setDiagSel({ codigo, descripcion: desc || codigo, valor: 0 });
				setDiagTerm(codigo);
				setDiagResults([]);
			}
			setIaNotice(
				draft.aviso ||
					(conIA
						? 'Borrador generado con IA — revise y edite antes de guardar.'
						: 'Borrador plantilla generado — revise antes de guardar.'),
			);
		} catch (err) {
			alert(err instanceof Error ? err.message : 'No se pudo generar con IA');
		} finally {
			setGenerating(false);
		}
	};

	const performSave = async () => {
		setSaving(true);
		try {
			await onSave({
				...form,
				IdSector: sectorEfectivo,
				NumeroDocumento: documentoEfectivo,
				Diagnostico: diagSel?.codigo?.slice(0, 8) || form.Diagnostico || '',
				DiagnosticoText: diagSel?.descripcion || form.DiagnosticoText || '',
				GeneradoConIA: generadoConIA,
			});
			if (refetch) await refetch();
			setShowDisclaimerConfirm(false);
			setDisclaimerAccepted(false);
			onClose();
		} catch (err) {
			if (err instanceof Error) alert(err.message || 'Error al guardar');
		} finally {
			setSaving(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.Epicrisis?.trim()) {
			alert('Debe ingresar el texto de la epicrisis');
			return;
		}
		if (!sectorEfectivo) {
			alert('No se pudo determinar el sector del paciente');
			return;
		}
		if (!documentoEfectivo) {
			alert('No se pudo determinar el documento del paciente');
			return;
		}

		if (generadoConIA) {
			setDisclaimerAccepted(false);
			setShowDisclaimerConfirm(true);
			return;
		}

		await performSave();
	};

	const handleConfirmDisclaimer = async () => {
		if (!disclaimerAccepted || saving) return;
		await performSave();
	};

	if (loading) {
		return <div className={styles.form}>Cargando epicrisis…</div>;
	}

	return (
		<>
			<form id="nueva-epicrisis-form" onSubmit={handleSubmit} className={styles.form}>
				{generadoConIA && (
					<div className={styles.alertIa} role="alert">
						<strong>Asistencia por IA.</strong> {DISCLAIMER_IA_UI}
					</div>
				)}

				{iaNotice && <div className={styles.notice}>{iaNotice}</div>}

				<div className={styles.formGrid}>
					<div className={styles.formGroup}>
						<label className={styles.label}>
							Fecha <span className={styles.required}>*</span>
						</label>
						<input
							type="date"
							className={styles.input}
							value={form.Fecha}
							onChange={(e) => set('Fecha', e.target.value)}
							required
						/>
					</div>

					<div className={styles.formGroup}>
						<label className={styles.label}>
							Hora <span className={styles.required}>*</span>
						</label>
						<input
							type="time"
							className={styles.input}
							value={form.Hora}
							onChange={(e) => set('Hora', e.target.value)}
							required
						/>
					</div>

					<div className={styles.formGroupFull} ref={diagWrapRef}>
						<label className={styles.label}>Diagnóstico CIE-10</label>
						<div className={styles.diagInputWrap}>
							<input
								type="text"
								className={styles.input}
								value={diagTerm}
								onChange={(e) => {
									const v = e.target.value.slice(0, 8).toUpperCase();
									setDiagTerm(v);
									setDiagSel(null);
									setForm((prev) => ({
										...prev,
										Diagnostico: v,
										DiagnosticoText: '',
									}));
								}}
								placeholder="Escriba código CIE-10…"
								maxLength={8}
								autoComplete="off"
							/>
						</div>

						{diagSel ? (
							<p className={styles.diagHint}>
								<strong>{diagSel.codigo}</strong>
								{diagSel.descripcion ? ` — ${diagSel.descripcion}` : ''}
								<button
									type="button"
									onClick={limpiarDiagnostico}
									className={styles.diagChange}
								>
									Cambiar
								</button>
							</p>
						) : null}

						{!diagSel && diagResults.length > 0 ? (
							<div className={styles.diagResults}>
								{diagResults.map((d) => (
									<button
										key={`${d.codigo}-${d.valor}`}
										type="button"
										onClick={() => seleccionarDiagnostico(d)}
										className={styles.diagResultBtn}
									>
										<span className={styles.diagCode}>{d.codigo}</span>
										<span className={styles.diagDesc}>{d.descripcion}</span>
									</button>
								))}
							</div>
						) : null}

						{!diagSel &&
						diagTerm.trim().length >= 1 &&
						!diagLoading &&
						diagResults.length === 0 ? (
							<p className={styles.diagEmpty}>Sin resultados.</p>
						) : null}
					</div>

					<div className={styles.formGroupFull}>
						<label className={styles.label}>
							Epicrisis <span className={styles.required}>*</span>
						</label>
						<div className={styles.epicrisisWrap}>
							<textarea
								className={styles.textarea}
								value={form.Epicrisis || ''}
								onChange={(e) => set('Epicrisis', e.target.value.slice(0, 8000))}
								placeholder="Resumen del episodio de hospitalización, evolución, conducta y plan de alta…"
								rows={16}
								required
							/>
							{!esEdicion && (
								<button
									type="button"
									onClick={handleGenerarIA}
									disabled={generating || !defaultIdVisita}
									title="Generar borrador con IA"
									aria-busy={generating}
									className={`${styles.iaBtn} ${generating ? styles.iaBtnLoading : ''}`}
								>
									{generating ? (
										<span className={styles.spinner} aria-hidden />
									) : (
										<Sparkles size={14} strokeWidth={2} />
									)}
									{generating ? 'Generando…' : 'IA'}
								</button>
							)}
						</div>
						<div className={styles.charCount}>
							{(form.Epicrisis || '').length} / 8000 caracteres
						</div>
					</div>
				</div>
			</form>

			{showDisclaimerConfirm &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						className={styles.confirmOverlay}
						role="dialog"
						aria-modal="true"
						aria-labelledby="epicrisis-disclaimer-title"
					>
						<div className={styles.confirmModal}>
							<h3 id="epicrisis-disclaimer-title" className={styles.confirmTitle}>
								Deslinde de responsabilidad
							</h3>
							<p className={styles.confirmText}>{DISCLAIMER_IA_UI}</p>
							<label className={styles.confirmCheck}>
								<input
									type="checkbox"
									checked={disclaimerAccepted}
									onChange={(e) => setDisclaimerAccepted(e.target.checked)}
									disabled={saving}
								/>
								<span>
									Confirmo haber revisado y validado el contenido. Acepto que la
									responsabilidad clínica y legal recae en el profesional firmante.
								</span>
							</label>
							<div className={styles.confirmActions}>
								<button
									type="button"
									className={styles.confirmCancel}
									onClick={() => {
										if (saving) return;
										setShowDisclaimerConfirm(false);
										setDisclaimerAccepted(false);
									}}
									disabled={saving}
								>
									Cancelar
								</button>
								<button
									type="button"
									className={styles.confirmAccept}
									onClick={handleConfirmDisclaimer}
									disabled={!disclaimerAccepted || saving}
								>
									{saving ? 'Guardando…' : 'Aceptar y guardar'}
								</button>
							</div>
						</div>
					</div>,
					document.body,
				)}
		</>
	);
}
