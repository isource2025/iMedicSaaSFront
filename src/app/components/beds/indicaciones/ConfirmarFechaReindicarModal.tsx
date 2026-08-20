"use client";

import styles from "./ResultadoReindicarModal.module.css";

type Props = {
	isOpen: boolean;
	cantidad: number;
	fechaHoy: string;
	fechaManana: string;
	onElegir: (ymd: string) => void;
	onCancel: () => void;
};

function formatear(ymd: string): string {
	const [y, m, d] = ymd.split("-");
	if (!y || !m || !d) return ymd;
	return `${d}/${m}/${y}`;
}

export default function ConfirmarFechaReindicarModal({
	isOpen,
	cantidad,
	fechaHoy,
	fechaManana,
	onElegir,
	onCancel,
}: Props) {
	if (!isOpen) return null;

	const n = cantidad;
	const label =
		n === 1 ? "1 indicación" : `${n} indicaciones`;

	return (
		<div className={styles.backdrop} onClick={onCancel} role="presentation">
			<div
				className={styles.modal}
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-labelledby="reindicar-fecha-title"
			>
				<h3 id="reindicar-fecha-title" className={styles.title}>
					¿Para qué día reindicar?
				</h3>
				<p className={styles.subtitle}>
					Vas a volver a indicar {label}. Elegí si rigen desde hoy o desde mañana.
				</p>

				<div className={styles.choiceList}>
					<button
						type="button"
						className={styles.choiceBtn}
						onClick={() => onElegir(fechaHoy)}
					>
						<span className={styles.choiceLabel}>Hoy</span>
						<span className={styles.choiceDate}>{formatear(fechaHoy)}</span>
					</button>
					<button
						type="button"
						className={styles.choiceBtn}
						onClick={() => onElegir(fechaManana)}
					>
						<span className={styles.choiceLabel}>Mañana</span>
						<span className={styles.choiceDate}>{formatear(fechaManana)}</span>
					</button>
				</div>

				<div className={styles.actions}>
					<button type="button" className={styles.btnGhost} onClick={onCancel}>
						Cancelar
					</button>
				</div>
			</div>
		</div>
	);
}
