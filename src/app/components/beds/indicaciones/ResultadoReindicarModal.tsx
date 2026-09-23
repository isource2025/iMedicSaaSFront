"use client";

import styles from "./ResultadoReindicarModal.module.css";

export type ReindicarPorTipo = {
	tipo: string;
	cantidad: number;
};

export type ReindicarErrorItem = {
	descripcion: string;
	motivo: string;
};

type Props = {
	isOpen: boolean;
	onClose: () => void;
	fecha: string;
	porTipo: ReindicarPorTipo[];
	exitosas: number;
	fallidas: number;
	errores?: ReindicarErrorItem[];
	omitidas?: number;
};

export default function ResultadoReindicarModal({
	isOpen,
	onClose,
	fecha,
	porTipo,
	exitosas,
	fallidas,
	errores = [],
	omitidas = 0,
}: Props) {
	if (!isOpen) return null;

	const titulo =
		exitosas > 0
			? "Reindicación realizada"
			: "No se pudieron reindicar";

	return (
		<div className={styles.backdrop} onClick={onClose} role="presentation">
			<div
				className={styles.modal}
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-labelledby="reindicar-resultado-title"
			>
				<h3 id="reindicar-resultado-title" className={styles.title}>
					{titulo}
				</h3>
				<p className={styles.subtitle}>
					{exitosas > 0
						? `${exitosas} indicación${exitosas === 1 ? "" : "es"} con fecha ${fecha}`
						: "Revisá las indicaciones e intentá de nuevo."}
				</p>

				{porTipo.length > 0 ? (
					<ul className={styles.list}>
						{porTipo.map((item) => (
							<li key={item.tipo} className={styles.row}>
								<span className={styles.tipo}>{item.tipo}</span>
								<span className={styles.count}>
									{item.cantidad}
									<span className={styles.countLabel}>
										{item.cantidad === 1 ? " reindicada" : " reindicadas"}
									</span>
								</span>
							</li>
						))}
					</ul>
				) : null}

				{omitidas > 0 ? (
					<p className={styles.info}>
						{omitidas} ya estaba{omitidas === 1 ? "" : "n"} cargada
						{omitidas === 1 ? "" : "s"} para ese día; no se volvieron a crear.
					</p>
				) : null}

				{fallidas > 0 ? (
					<div className={styles.failBox}>
						<p className={styles.fail}>
							No se pudieron reindicar {fallidas} indicación
							{fallidas === 1 ? "" : "es"}.
						</p>
						{errores.length > 0 ? (
							<ul className={styles.errorList}>
								{errores.map((err, idx) => (
									<li key={`${err.descripcion}-${idx}`} className={styles.errorItem}>
										<span className={styles.errorName}>{err.descripcion}</span>
										<span className={styles.errorReason}>{err.motivo}</span>
									</li>
								))}
							</ul>
						) : (
							<p className={styles.errorReason}>
								Puede deberse a que ya existían para ese día o a un problema de
								conexión. Revisá el listado del día elegido e intentá de nuevo.
							</p>
						)}
					</div>
				) : null}

				<div className={styles.actions}>
					<button type="button" className={styles.btn} onClick={onClose}>
						Aceptar
					</button>
				</div>
			</div>
		</div>
	);
}
