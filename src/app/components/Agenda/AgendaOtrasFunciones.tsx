'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './AgendaOtrasFunciones.module.css';

interface Props {
	disabledPlanilla?: boolean;
	onPlanillaTurnos: () => void;
}

export default function AgendaOtrasFunciones({
	disabledPlanilla = false,
	onPlanillaTurnos,
}: Props) {
	const [abierto, setAbierto] = useState(false);
	const panelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!abierto || !panelRef.current) return;
		panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}, [abierto]);

	return (
		<div className={styles.wrap} ref={panelRef}>
			<button
				type="button"
				className={`${styles.toggle} ${abierto ? styles.toggleOpen : ''}`}
				aria-expanded={abierto}
				onClick={() => setAbierto((v) => !v)}
			>
				<span>Otras Funciones</span>
				<span className={styles.chevron} aria-hidden>
					▾
				</span>
			</button>

			{abierto ? (
				<div className={styles.panel} role="region" aria-label="Otras funciones">
					<button
						type="button"
						className={styles.accion}
						disabled={disabledPlanilla}
						onClick={onPlanillaTurnos}
						title={
							disabledPlanilla
								? 'Seleccioná un profesional con agenda para generar la planilla'
								: 'Previsualizar planilla de turnos del día'
						}
					>
						<span className={styles.accionIcon} aria-hidden>
							📄
						</span>
						<span className={styles.accionTitle}>Planilla de turnos</span>
					</button>
				</div>
			) : null}
		</div>
	);
}
