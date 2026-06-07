'use client';

import { usePermiso } from '@/app/hooks/usePermiso';
import BotConfigPanel from '@/app/components/Bot/BotConfigPanel';
import styles from '../agenda/agenda.module.css';

export default function BotConfigPage() {
	const { loaded, puede, puedeSubmodulo } = usePermiso();
	const puedeVer =
		puede('TURNOS.ADMIN.VER') || puedeSubmodulo('TURNOS', 'ADMIN');

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
				<p className={styles.warning}>No tenés permiso para configurar el bot.</p>
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<div className={styles.layoutFull}>
				<div className={styles.main}>
					<div className={styles.mainCard}>
						<div className={styles.cardHeader}>
							<h1 className={styles.cardTitle}>Configuración del bot</h1>
							<p className={styles.cardSubtitle}>
								Prompt, mensajes, reglas y flujo paso a paso del asistente de turnos.
							</p>
						</div>
						<div className={styles.cardBody}>
							<BotConfigPanel />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
