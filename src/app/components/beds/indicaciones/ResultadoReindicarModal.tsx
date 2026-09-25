"use client";

import { useEffect } from "react";
import styles from "./ResultadoReindicarModal.module.css";

export type ReindicarPorTipo = {
	tipo: string;
	cantidad: number;
};

export type ReindicarErrorItem = {
	descripcion: string;
	motivo: string;
};

export type ReindicarItemStatus = "pendiente" | "cargando" | "ok" | "omitida" | "error";

export type ReindicarItemTrack = {
	id: string;
	descripcion: string;
	status: ReindicarItemStatus;
	motivo?: string;
};

export type ReindicarModalFase = "progreso" | "exito" | "resumen";

type Props = {
	isOpen: boolean;
	fase: ReindicarModalFase;
	fecha: string;
	items: ReindicarItemTrack[];
	porTipo: ReindicarPorTipo[];
	onClose: () => void;
	/** Tras mostrar la animación de éxito, avanza al resumen */
	onExitoComplete?: () => void;
};

const EXITO_MS = 1800;

function etiquetaEstado(status: ReindicarItemStatus): string {
	switch (status) {
		case "pendiente":
			return "En espera";
		case "cargando":
			return "Cargando…";
		case "ok":
			return "Cargada";
		case "omitida":
			return "Ya existía";
		case "error":
			return "No se pudo";
		default:
			return "";
	}
}

function SuccessCheckmark() {
	return (
		<div className={styles.successAnimation} aria-hidden>
			<svg
				className={styles.checkmark}
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 52 52"
			>
				<circle
					className={styles.checkmarkCircle}
					cx="26"
					cy="26"
					r="25"
					fill="none"
				/>
				<path
					className={styles.checkmarkCheck}
					fill="none"
					d="M14.1 27.2l7.1 7.2 16.7-16.8"
				/>
			</svg>
		</div>
	);
}

export default function ResultadoReindicarModal({
	isOpen,
	fase,
	fecha,
	items,
	porTipo,
	onClose,
	onExitoComplete,
}: Props) {
	useEffect(() => {
		if (!isOpen || fase !== "exito" || !onExitoComplete) return;
		const t = window.setTimeout(() => {
			onExitoComplete();
		}, EXITO_MS);
		return () => window.clearTimeout(t);
	}, [isOpen, fase, onExitoComplete]);

	if (!isOpen) return null;

	const total = items.length;
	const hechas = items.filter((i) => i.status !== "pendiente" && i.status !== "cargando").length;
	const exitosas = items.filter((i) => i.status === "ok").length;
	const omitidas = items.filter((i) => i.status === "omitida").length;
	const fallidas = items.filter((i) => i.status === "error").length;
	const actual = items.find((i) => i.status === "cargando");
	const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;

	const enProgreso = fase === "progreso";
	const enExito = fase === "exito";
	const enResumen = fase === "resumen";

	const titulo = enProgreso
		? "Reindicando…"
		: enExito
			? exitosas > 0
				? "¡Listo!"
				: "Proceso finalizado"
			: exitosas > 0
				? "Reindicación realizada"
				: "No se pudieron reindicar";

	const subtitle = enProgreso
		? `Cargando ${Math.min(hechas + 1, total)} de ${total}${fecha ? ` · ${fecha}` : ""}`
		: enExito
			? exitosas > 0
				? `${exitosas} indicación${exitosas === 1 ? "" : "es"} reindicada${exitosas === 1 ? "" : "s"}`
				: "Preparando el resumen…"
			: exitosas > 0
				? `${exitosas} indicación${exitosas === 1 ? "" : "es"} con fecha ${fecha}`
				: "Revisá las indicaciones e intentá de nuevo.";

	const handleBackdrop = () => {
		if (enResumen) onClose();
	};

	return (
		<div className={styles.backdrop} onClick={handleBackdrop} role="presentation">
			<div
				className={`${styles.modal} ${enExito ? styles.modalExito : ""}`}
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-labelledby="reindicar-resultado-title"
				aria-busy={enProgreso || enExito}
			>
				{enExito ? (
					<div className={styles.exitoInner} key="fase-exito">
						<SuccessCheckmark />
						<h3 id="reindicar-resultado-title" className={styles.title}>
							{titulo}
						</h3>
						<p className={styles.subtitle}>{subtitle}</p>
					</div>
				) : (
					<>
						<h3 id="reindicar-resultado-title" className={`${styles.title} modal-title`}>
							{titulo}
						</h3>
						<p className={styles.subtitle}>{subtitle}</p>

						{enProgreso ? (
							<div className={styles.progressBlock}>
								<div className={styles.progressMeta}>
									<span>
										{hechas}/{total}
									</span>
									<span>{pct}%</span>
								</div>
								<div className={styles.progressTrack} aria-hidden>
									<div
										className={styles.progressFill}
										style={{ width: `${pct}%` }}
									/>
								</div>
								{actual ? (
									<p className={styles.progressCurrent}>
										Ahora: <strong>{actual.descripcion}</strong>
									</p>
								) : null}
							</div>
						) : null}

						{enResumen && porTipo.length > 0 ? (
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

						{enResumen && omitidas > 0 ? (
							<p className={styles.info}>
								{omitidas} ya estaba{omitidas === 1 ? "" : "n"} cargada
								{omitidas === 1 ? "" : "s"} para ese día; no se volvieron a crear.
							</p>
						) : null}

						{(enProgreso || enResumen) && items.length > 0 ? (
							<ul className={styles.trackList}>
								{items.map((item) => (
									<li
										key={item.id}
										className={`${styles.trackItem} ${styles[`track_${item.status}`] || ""}`}
									>
										<span className={styles.trackDot} aria-hidden />
										<div className={styles.trackBody}>
											<span className={styles.trackName}>{item.descripcion}</span>
											{item.status === "error" && item.motivo ? (
												<span className={styles.trackMotivo}>{item.motivo}</span>
											) : item.status === "omitida" && item.motivo ? (
												<span className={styles.trackMotivoMuted}>
													{item.motivo}
												</span>
											) : null}
										</div>
										<span className={styles.trackStatus}>
											{etiquetaEstado(item.status)}
										</span>
									</li>
								))}
							</ul>
						) : null}

						{enResumen && fallidas > 0 ? (
							<p className={styles.failSummary}>
								{fallidas} no se pudieron cargar. Detalle arriba en cada ítem.
							</p>
						) : null}

						{enResumen ? (
							<div className={styles.actions}>
								<button type="button" className={styles.btn} onClick={onClose}>
									Aceptar
								</button>
							</div>
						) : (
							<p className={styles.waitHint}>
								No cierres esta ventana hasta que termine.
							</p>
						)}
					</>
				)}
			</div>
		</div>
	);
}
