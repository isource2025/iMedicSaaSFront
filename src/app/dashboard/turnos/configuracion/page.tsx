'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePermiso } from '@/app/hooks/usePermiso';
import TurneroConfigPanel from '@/app/components/Turnero/TurneroConfigPanel';
import BotConfigPanel from '@/app/components/Bot/BotConfigPanel';
import AgendaTab from '@/app/components/Personal/AgendaTab/AgendaTab';
import { agendaService } from '@/app/services/agendaService';
import styles from '../agenda/agenda.module.css';
import tabStyles from './configuracion.module.css';

type TabId = 'turnero' | 'horarios' | 'bot';

const TABS: { id: TabId; label: string; icon: string }[] = [
	{ id: 'turnero', label: 'Pantalla turnero', icon: '📺' },
	{ id: 'horarios', label: 'Horarios agenda', icon: '📅' },
	{ id: 'bot', label: 'Bot WhatsApp', icon: '💬' },
];

function ConfiguracionTurnosContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { loaded, puede, puedeSubmodulo } = usePermiso();
	const puedeVer =
		puede('TURNOS.ADMIN.VER') || puedeSubmodulo('TURNOS', 'ADMIN');

	const tabFromUrl = (searchParams.get('tab') as TabId) || 'turnero';
	const [tab, setTab] = useState<TabId>(
		TABS.some((t) => t.id === tabFromUrl) ? tabFromUrl : 'turnero',
	);

	const [profesionales, setProfesionales] = useState<
		{ matricula: number; nombre: string }[]
	>([]);
	const [matriculaSel, setMatriculaSel] = useState<number | null>(null);

	const setTabAndUrl = (next: TabId) => {
		setTab(next);
		router.replace(`/dashboard/turnos/configuracion?tab=${next}`, { scroll: false });
	};

	const cargarProfesionales = useCallback(async () => {
		try {
			const list = await agendaService.getProfesionales();
			const mapped = (list || []).map((p) => ({
				matricula: p.matricula,
				nombre: p.nombre || `Mat. ${p.matricula}`,
			}));
			setProfesionales(mapped);
			setMatriculaSel((prev) => prev ?? mapped[0]?.matricula ?? null);
		} catch {
			setProfesionales([]);
		}
	}, []);

	useEffect(() => {
		if (tab === 'horarios') void cargarProfesionales();
	}, [tab, cargarProfesionales]);

	useEffect(() => {
		const t = searchParams.get('tab') as TabId;
		if (t && TABS.some((x) => x.id === t)) setTab(t);
	}, [searchParams]);

	if (!loaded) {
		return (
			<div className={styles.page}>
				<div className={styles.loading}>Cargando permisos…</div>
			</div>
		);
	}

	if (!puedeVer) {
		return (
			<div className={styles.page}>
				<p className={styles.warning}>No tenés permiso para configurar turnos.</p>
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<div className={styles.layoutFull}>
				<div className={styles.main}>
					<div className={styles.mainCard}>
						<div className={styles.cardHeader}>
							<h1 className={styles.cardTitle}>Configuración de turnos</h1>
							<p className={styles.cardSubtitle}>
								Pantalla de llamados, horarios de agenda y asistente WhatsApp.
							</p>
						</div>
						<div className={tabStyles.tabs}>
							{TABS.map((t) => (
								<button
									key={t.id}
									type="button"
									className={`${tabStyles.tab} ${tab === t.id ? tabStyles.tabActive : ''}`}
									onClick={() => setTabAndUrl(t.id)}
								>
									<span>{t.icon}</span> {t.label}
								</button>
							))}
						</div>
						<div className={styles.cardBody}>
							{tab === 'turnero' && <TurneroConfigPanel />}
							{tab === 'bot' && <BotConfigPanel />}
							{tab === 'horarios' && (
								<div className={tabStyles.horariosWrap}>
									<div className={tabStyles.horariosToolbar}>
										<label className={tabStyles.horariosLabel}>
											Profesional
											<select
												className={tabStyles.horariosSelect}
												value={matriculaSel ?? ''}
												onChange={(e) =>
													setMatriculaSel(Number(e.target.value) || null)
												}
											>
												{profesionales.length === 0 && (
													<option value="">Sin profesionales con agenda</option>
												)}
												{profesionales.map((p) => (
													<option key={p.matricula} value={p.matricula}>
														{p.nombre}
													</option>
												))}
											</select>
										</label>
										<p className={tabStyles.horariosHint}>
											Misma configuración que en Personal → editar. Los cambios se guardan por
											profesional.
										</p>
									</div>
									<AgendaTab matricula={matriculaSel} />
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function TurnosConfiguracionPage() {
	return (
		<Suspense
			fallback={
				<div className={styles.page}>
					<div className={styles.loading}>Cargando configuración…</div>
				</div>
			}
		>
			<ConfiguracionTurnosContent />
		</Suspense>
	);
}
