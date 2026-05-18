'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { TurnoAdminRow } from '@/app/services/turnosAdminService';
import {
	opcionesMenuTurnoAdmin,
	type TurnoAdminAction,
} from '@/app/components/Agenda/turnoAdminMenuOpciones';
import styles from './SlotTurnoMenu.module.css';

interface Props {
	open: boolean;
	x: number;
	y: number;
	row: TurnoAdminRow | null;
	puedeEditar: boolean;
	puedeEliminar: boolean;
	puedeRac: boolean;
	onClose: () => void;
	onAction: (action: TurnoAdminAction, row: TurnoAdminRow) => void;
}

export default function TurnoAdminMenu({
	open,
	x,
	y,
	row,
	puedeEditar,
	puedeEliminar,
	puedeRac,
	onClose,
	onAction,
}: Props) {
	const ref = useRef<HTMLDivElement>(null);

	const opciones = useMemo(() => {
		if (!row) return [];
		return opcionesMenuTurnoAdmin(row, {
			puedeEditar,
			puedeEliminar,
			puedeRac,
		});
	}, [row, puedeEditar, puedeEliminar, puedeRac]);

	useEffect(() => {
		if (!open) return;
		const onDown = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) onClose();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		document.addEventListener('mousedown', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDown);
			document.removeEventListener('keydown', onKey);
		};
	}, [open, onClose]);

	if (!open || !row || opciones.length === 0) return null;

	const offset = 6;
	const panelW = 240;
	const panelH = Math.min(360, 48 + opciones.length * 40);
	let left = x + offset;
	let top = y + offset;
	if (left + panelW > window.innerWidth - 8) left = x - panelW - offset;
	if (top + panelH > window.innerHeight - 8) top = y - panelH - offset;
	if (left < 8) left = 8;
	if (top < 8) top = 8;

	const header = [
		row.fecha,
		row.hora,
		row.sector || null,
		row.pacienteNombre,
		row.tipoTurnoLabel === 'SOBRETURNO' ? 'ST' : null,
	]
		.filter(Boolean)
		.join(' · ');

	return createPortal(
		<div
			ref={ref}
			className={styles.panel}
			style={{ left, top }}
			role='menu'
			onMouseDown={(e) => e.stopPropagation()}
		>
			<div className={styles.header}>{header || `Turno #${row.idTurno}`}</div>
			<ul className={styles.list}>
				{opciones.map((opt) => (
					<li key={opt.id}>
						<button
							type='button'
							className={`${styles.item} ${opt.danger ? styles.itemDanger : ''}`}
							onClick={() => onAction(opt.id, row)}
						>
							<span>{opt.label}</span>
						</button>
					</li>
				))}
			</ul>
		</div>,
		document.body,
	);
}
