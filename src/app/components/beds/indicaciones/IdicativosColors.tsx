import styles from './IndicativoColors.module.css';

export default function IndicativoColors({
	setHelpOpen,
}: {
	setHelpOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
	return (
		<div className={styles.modalBackdrop}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<strong>Referencias para Indicaciones</strong>
					<button className={styles.closeX} onClick={() => setHelpOpen(false)}>
						×
					</button>
				</div>

				<div className={styles.modalBody}>
					<ul className={styles.legend}>
						<li>
							<span className={`${styles.dot} ${styles.green}`} />
							VERDE: Falta 1 hora o más para la próxima aplicación.
						</li>
						<li>
							<span className={`${styles.dot} ${styles.celeste}`} />
							CELESTE: Falta menos de 1 hora para la próxima aplicación.
						</li>
						<li>
							<span className={`${styles.dot} ${styles.yellow}`} />
							AMARILLO: Faltan menos de 30 minutos para la próxima aplicación.
						</li>
						<li>
							<span className={`${styles.dot} ${styles.blue}`} />
							AZUL: Faltan menos de 10 minutos para la próxima aplicación.
						</li>
						<li>
							<span className={`${styles.dot} ${styles.red}`} />
							ROJO: Ya pasó la hora de la próxima aplicación.
						</li>
						<li>
							<span className={`${styles.icon} ${styles.suspended}`}>✖</span>
							INDICACIÓN suspendida (dejada sin efecto) o fue reemplazada.
						</li>
						<li>
							<span className={`${styles.icon} ${styles.once}`}>U</span>
							INDICACIÓN por única vez.
						</li>
					</ul>
				</div>

				<div className={styles.modalFooter}>
					<button className={styles.btn} onClick={() => setHelpOpen(false)}>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	);
}
