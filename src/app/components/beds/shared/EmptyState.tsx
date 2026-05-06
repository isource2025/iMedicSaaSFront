"use client";

import React from "react";
import styles from "./EmptyState.module.css";

const ICONS: Record<string, string> = {
	indicaciones: "💊",
	controles: "🩺",
	medicacion: "💉",
	evolucion: "📋",
	insumos: "🧰",
	movimientos: "🔄",
	adjuntos: "📎",
	default: "📂",
};

interface EmptyStateProps {
	/** Texto principal */
	text?: string;
	/** Descripción secundaria */
	description?: string;
	/** Ícono emoji o variante predefinida */
	icon?: string;
	/** Variante por tipo de sección */
	variant?: keyof typeof ICONS;
	/** Botón de acción */
	actionLabel?: string;
	onAction?: () => void;
}

export default function EmptyState({
	text = "Sin datos",
	description,
	icon,
	variant = "default",
	actionLabel,
	onAction,
}: EmptyStateProps) {
	const resolvedIcon = icon ?? ICONS[variant] ?? ICONS.default;

	return (
		<div className={styles.wrap}>
			<div className={styles.iconWrap} aria-hidden>
				<span className={styles.icon}>{resolvedIcon}</span>
				<div className={styles.pulse} />
			</div>
			<h3 className={styles.title}>{text}</h3>
			{description && (
				<p className={styles.description}>{description}</p>
			)}
			{actionLabel && onAction && (
				<button
					type="button"
					className={styles.actionBtn}
					onClick={onAction}
				>
					<span aria-hidden>+</span> {actionLabel}
				</button>
			)}
		</div>
	);
}
