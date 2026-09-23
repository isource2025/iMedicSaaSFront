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

export type ReindicarItemStatus = "pendiente" | "cargando" | "ok" | "omitida" | "error";

export type ReindicarItemTrack = {
	id: string;
	descripcion: string;
	status: ReindicarItemStatus;
	motivo?: string;
};

type Props = {
	isOpen: boolean;
	fase: "progreso" | "resumen";
	fecha: string;
	items: ReindicarItemTrack[];
	porTipo: ReindicarPorTipo[];
	onClose: () => void;
};

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

export default function ResultadoReindicarModal({
	isOpen,
	fase,
	fecha,
	items,
	porTipo,
	onClose,
}: Props) {
	if (!isOpen) return null;

	const total = items.length;
	const hechas = items.filter((i) => i.status !== "pendiente" && i.status !== "cargando").length;
	const exitosas = items.filter((i) => i.status === "ok").length;
	const omitidas = items.filter((i) => i.status === "omitida").length;
	const fallidas = items.filter((i) => i.status === "error").length;
	const actual = items.find((i) => i.status === "cargando");
	const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;

	const enProgreso = fase === "progreso";
	const titulo = enProgreso
		? "Reindicando…"
		: exitosas > 0
			? "Reindicación realizada"
			: "No se pudieron reindicar";

	const subtitle = enProgreso
		? `Cargando ${Math.min(hechas + 1, total)} de ${total}${fecha ? ` · ${fecha}` : ""}`
		: exitosas > 0
			? `${exitosas} indicación${exitosas === 1 ? "" : "es"} con fecha ${fecha}`
			: "Revisá las indicaciones e intentá de nuevo.";

	const handleBackdrop = () => {
		if (!enProgreso) onClose();
	};

	return (
		<div className={styles.backdrop} onClick={handleBackdrop} role="presentation">
			<div
				className={styles.modal}
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-labelledby="reindicar-resultado-title"
				aria-busy={enProgreso}
			>
				<h3 id="reindicar-resultado-title" className={styles.title}>
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
							<div className={styles.progressFill} style={{ width: `${pct}%` }} />
						</div>
						{actual ? (
							<p className={styles.progressCurrent}>
								Ahora: <strong>{actual.descripcion}</strong>
							</p>
						) : null}
					</div>
				) : null}

				{!enProgreso && porTipo.length > 0 ? (
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

				{!enProgreso && omitidas > 0 ? (
					<p className={styles.info}>
						{omitidas} ya estaba{omitidas === 1 ? "" : "n"} cargada
						{omitidas === 1 ? "" : "s"} para ese día; no se volvieron a crear.
					</p>
				) : null}

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
									<span className={styles.trackMotivoMuted}>{item.motivo}</span>
								) : null}
							</div>
							<span className={styles.trackStatus}>{etiquetaEstado(item.status)}</span>
						</li>
					))}
				</ul>

				{!enProgreso && fallidas > 0 ? (
					<p className={styles.failSummary}>
						{fallidas} no se pudieron cargar. Detalle arriba en cada ítem.
					</p>
				) : null}

				{!enProgreso ? (
					<div className={styles.actions}>
						<button type="button" className={styles.btn} onClick={onClose}>
							Aceptar
						</button>
					</div>
				) : (
					<p className={styles.waitHint}>No cierres esta ventana hasta que termine.</p>
				)}
			</div>
		</div>
	);
}
