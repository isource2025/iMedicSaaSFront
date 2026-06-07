'use client';

import { useCallback, useEffect, useState } from 'react';
import { botIntegrationService } from '@/app/services/botIntegrationService';
import type { BotConfigAdmin, BotFlujoPaso } from '@/app/types/botIntegration';
import styles from './BotConfigPanel.module.css';

type SeccionConfig = 'general' | 'prompt' | 'mensajes' | 'reglas' | 'flujo';

const SECCIONES: { id: SeccionConfig; label: string; icon: string }[] = [
	{ id: 'general', label: 'General', icon: '🏥' },
	{ id: 'prompt', label: 'Prompt IA', icon: '🧠' },
	{ id: 'mensajes', label: 'Mensajes', icon: '💬' },
	{ id: 'reglas', label: 'Reglas', icon: '⚙️' },
	{ id: 'flujo', label: 'Flujo paso a paso', icon: '📋' },
];

interface FormState {
	nombreInstitucion: string;
	promptSistema: string;
	mensajes: BotConfigAdmin['mensajes'];
	reglas: BotConfigAdmin['reglas'];
	flujo: BotFlujoPaso[];
}

function configToForm(cfg: BotConfigAdmin): FormState {
	return {
		nombreInstitucion: cfg.nombreInstitucion || '',
		promptSistema: cfg.promptSistema || '',
		mensajes: { ...cfg.mensajes },
		reglas: { ...cfg.reglas },
		flujo: (cfg.flujo || []).map((p) => ({ ...p })),
	};
}

export default function BotConfigPanel() {
	const [seccion, setSeccion] = useState<SeccionConfig>('general');
	const [wizardPaso, setWizardPaso] = useState(0);
	const [form, setForm] = useState<FormState | null>(null);
	const [meta, setMeta] = useState<{
		apiConfigurada: boolean;
		configDbDisponible: boolean;
		profesionalesCount: number;
	} | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [okMsg, setOkMsg] = useState<string | null>(null);

	const cargar = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const cfg = await botIntegrationService.getAdminConfig();
			setForm(configToForm(cfg));
			setMeta({
				apiConfigurada: cfg.apiConfigurada,
				configDbDisponible: cfg.configDbDisponible,
				profesionalesCount: cfg.profesionalesCount,
			});
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al cargar');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const guardar = async () => {
		if (!form) return;
		setSaving(true);
		setError(null);
		setOkMsg(null);
		try {
			const cfg = await botIntegrationService.saveConfig({
				nombreInstitucion: form.nombreInstitucion,
				promptSistema: form.promptSistema,
				mensajes: form.mensajes,
				reglas: form.reglas,
				flujo: form.flujo,
			});
			setForm(configToForm(cfg));
			setMeta({
				apiConfigurada: cfg.apiConfigurada,
				configDbDisponible: cfg.configDbDisponible,
				profesionalesCount: cfg.profesionalesCount,
			});
			setOkMsg('Configuración guardada correctamente.');
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al guardar');
		} finally {
			setSaving(false);
		}
	};

	const updateFlujoPaso = (index: number, patch: Partial<BotFlujoPaso>) => {
		if (!form) return;
		const flujo = form.flujo.map((p, i) => (i === index ? { ...p, ...patch } : p));
		setForm({ ...form, flujo });
	};

	if (loading || !form) {
		return <div className={styles.loading}>Cargando configuración…</div>;
	}

	const pasoFlujo = form.flujo[wizardPaso];
	const pasosActivos = form.flujo.filter((p) => p.activo).length;

	return (
		<div className={styles.panel}>
			<aside className={styles.nav}>
				<p className={styles.navTitle}>Secciones</p>
				{SECCIONES.map((s) => (
					<button
						key={s.id}
						type="button"
						className={`${styles.navBtn} ${seccion === s.id ? styles.navBtnActive : ''}`}
						onClick={() => setSeccion(s.id)}
					>
						<span aria-hidden>{s.icon}</span> {s.label}
					</button>
				))}
				<div className={styles.navFooter}>
					<button
						type="button"
						className={styles.btnSave}
						disabled={saving}
						onClick={guardar}
					>
						{saving ? 'Guardando…' : 'Guardar cambios'}
					</button>
				</div>
			</aside>

			<div className={styles.content}>
				{error && <div className={styles.error}>{error}</div>}
				{okMsg && <div className={styles.ok}>{okMsg}</div>}

				{seccion === 'general' && (
					<section className={styles.section}>
						<h2>Institución y estado</h2>
						<p className={styles.hint}>
							Configuración del asistente de turnos por WhatsApp para tu hospital.
						</p>
						<label className={styles.field}>
							Nombre de la institución
							<input
								value={form.nombreInstitucion}
								onChange={(e) =>
									setForm({ ...form, nombreInstitucion: e.target.value })
								}
								placeholder="Hospital iMedic"
							/>
						</label>
						<div className={styles.statusGrid}>
							<div className={styles.statusCard}>
								<span className={styles.statusLabel}>Profesionales con agenda</span>
								<strong>{meta?.profesionalesCount ?? 0}</strong>
							</div>
							<div className={styles.statusCard}>
								<span className={styles.statusLabel}>Integración activa</span>
								<strong className={meta?.apiConfigurada ? styles.okText : styles.warnText}>
									{meta?.apiConfigurada ? 'Conectada' : 'Pendiente'}
								</strong>
							</div>
							<div className={styles.statusCard}>
								<span className={styles.statusLabel}>Guardado en BD</span>
								<strong className={meta?.configDbDisponible ? styles.okText : styles.warnText}>
									{meta?.configDbDisponible ? 'Disponible' : 'Solo entorno'}
								</strong>
							</div>
							<div className={styles.statusCard}>
								<span className={styles.statusLabel}>Pasos del flujo activos</span>
								<strong>{pasosActivos}</strong>
							</div>
						</div>
					</section>
				)}

				{seccion === 'prompt' && (
					<section className={styles.section}>
						<h2>Prompt del asistente (IA)</h2>
						<p className={styles.hint}>
							Instrucciones base para el modelo de lenguaje. Definí tono, límites y
							comportamiento general del bot.
						</p>
						<label className={styles.field}>
							Prompt de sistema
							<textarea
								rows={12}
								value={form.promptSistema}
								onChange={(e) =>
									setForm({ ...form, promptSistema: e.target.value })
								}
								placeholder="Sos un asistente amable de turnos médicos…"
							/>
						</label>
					</section>
				)}

				{seccion === 'mensajes' && (
					<section className={styles.section}>
						<h2>Mensajes clave</h2>
						<p className={styles.hint}>
							Textos que el bot envía en momentos importantes de la conversación.
						</p>
						<label className={styles.field}>
							Bienvenida
							<textarea
								rows={3}
								value={form.mensajes.bienvenida}
								onChange={(e) =>
									setForm({
										...form,
										mensajes: { ...form.mensajes, bienvenida: e.target.value },
									})
								}
							/>
						</label>
						<label className={styles.field}>
							Pedir DNI
							<textarea
								rows={2}
								value={form.mensajes.pedirDni}
								onChange={(e) =>
									setForm({
										...form,
										mensajes: { ...form.mensajes, pedirDni: e.target.value },
									})
								}
							/>
						</label>
						<label className={styles.field}>
							Confirmación de turno
							<textarea
								rows={3}
								value={form.mensajes.confirmacion}
								onChange={(e) =>
									setForm({
										...form,
										mensajes: { ...form.mensajes, confirmacion: e.target.value },
									})
								}
							/>
						</label>
						<p className={styles.varsHint}>
							Variables disponibles en confirmación:{' '}
							<code>{'{fecha}'}</code>, <code>{'{hora}'}</code>, <code>{'{medico}'}</code>
						</p>
					</section>
				)}

				{seccion === 'reglas' && (
					<section className={styles.section}>
						<h2>Reglas de negocio</h2>
						<div className={styles.rulesGrid}>
							<label className={styles.field}>
								Anticipación mínima (horas)
								<input
									type="number"
									min={0}
									value={form.reglas.anticipacionMinHoras}
									onChange={(e) =>
										setForm({
											...form,
											reglas: {
												...form.reglas,
												anticipacionMinHoras: Number(e.target.value),
											},
										})
									}
								/>
							</label>
							<label className={styles.field}>
								Máx. días de antelación
								<input
									type="number"
									min={1}
									value={form.reglas.diasMaxAntelacion}
									onChange={(e) =>
										setForm({
											...form,
											reglas: {
												...form.reglas,
												diasMaxAntelacion: Number(e.target.value),
											},
										})
									}
								/>
							</label>
							<label className={styles.field}>
								Máx. turnos por paciente / día
								<input
									type="number"
									min={1}
									value={form.reglas.maxTurnosPorPacienteDia}
									onChange={(e) =>
										setForm({
											...form,
											reglas: {
												...form.reglas,
												maxTurnosPorPacienteDia: Number(e.target.value),
											},
										})
									}
								/>
							</label>
						</div>
						<div className={styles.toggles}>
							<label className={styles.toggle}>
								<input
									type="checkbox"
									checked={form.reglas.requiereRenaper}
									onChange={(e) =>
										setForm({
											...form,
											reglas: { ...form.reglas, requiereRenaper: e.target.checked },
										})
									}
								/>
								Validar identidad con RENAPER
							</label>
							<label className={styles.toggle}>
								<input
									type="checkbox"
									checked={form.reglas.crearPacienteAutomatico}
									onChange={(e) =>
										setForm({
											...form,
											reglas: {
												...form.reglas,
												crearPacienteAutomatico: e.target.checked,
											},
										})
									}
								/>
								Alta automática de paciente si no existe
							</label>
							<label className={styles.toggle}>
								<input
									type="checkbox"
									checked={form.reglas.permiteSobreturno}
									onChange={(e) =>
										setForm({
											...form,
											reglas: { ...form.reglas, permiteSobreturno: e.target.checked },
										})
									}
								/>
								Permitir sobreturnos
							</label>
						</div>
					</section>
				)}

				{seccion === 'flujo' && (
					<section className={styles.section}>
						<h2>Wizard — flujo paso a paso</h2>
						<p className={styles.hint}>
							Definí el recorrido del paciente. Podés activar/desactivar pasos y personalizar
							el mensaje en cada etapa.
						</p>

						<div className={styles.wizardSteps}>
							{form.flujo.map((p, i) => (
								<button
									key={p.id}
									type="button"
									className={`${styles.wizardStepBtn} ${wizardPaso === i ? styles.wizardStepActive : ''} ${!p.activo ? styles.wizardStepOff : ''}`}
									onClick={() => setWizardPaso(i)}
								>
									<span className={styles.wizardNum}>{p.paso}</span>
									<span>{p.titulo}</span>
								</button>
							))}
						</div>

						{pasoFlujo && (
							<div className={styles.wizardCard}>
								<div className={styles.wizardCardHead}>
									<h3>
										Paso {pasoFlujo.paso}: {pasoFlujo.titulo}
									</h3>
									<label className={styles.toggleInline}>
										<input
											type="checkbox"
											checked={pasoFlujo.activo}
											onChange={(e) =>
												updateFlujoPaso(wizardPaso, { activo: e.target.checked })
											}
										/>
										Paso activo
									</label>
								</div>
								<label className={styles.field}>
									Título del paso
									<input
										value={pasoFlujo.titulo}
										onChange={(e) =>
											updateFlujoPaso(wizardPaso, { titulo: e.target.value })
										}
									/>
								</label>
								<label className={styles.field}>
									Mensaje al paciente en este paso
									<textarea
										rows={3}
										value={pasoFlujo.mensajeUsuario}
										onChange={(e) =>
											updateFlujoPaso(wizardPaso, { mensajeUsuario: e.target.value })
										}
									/>
								</label>
								<label className={styles.field}>
									Descripción interna (solo referencia)
									<input
										value={pasoFlujo.descripcion || ''}
										onChange={(e) =>
											updateFlujoPaso(wizardPaso, { descripcion: e.target.value })
										}
									/>
								</label>
								<div className={styles.wizardNav}>
									<button
										type="button"
										className={styles.btnSecondary}
										disabled={wizardPaso <= 0}
										onClick={() => setWizardPaso((n) => n - 1)}
									>
										← Anterior
									</button>
									<button
										type="button"
										className={styles.btnSecondary}
										disabled={wizardPaso >= form.flujo.length - 1}
										onClick={() => setWizardPaso((n) => n + 1)}
									>
										Siguiente →
									</button>
								</div>
							</div>
						)}

						<div className={styles.previewFlow}>
							<h4>Vista previa del recorrido</h4>
							<ol>
								{form.flujo.map((p) => (
									<li key={p.id} className={!p.activo ? styles.previewOff : ''}>
										<strong>{p.titulo}</strong>
										{p.activo ? '' : ' (inactivo)'}
										<span>{p.mensajeUsuario}</span>
									</li>
								))}
							</ol>
						</div>
					</section>
				)}
			</div>
		</div>
	);
}
