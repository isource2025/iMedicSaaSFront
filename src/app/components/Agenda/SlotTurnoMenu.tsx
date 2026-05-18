'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { AgendaSlot } from '@/app/services/agendaService';
import styles from './SlotTurnoMenu.module.css';

export type SlotMenuAction =
	| 'asignar'
	| 'cambiar'
	| 'borrar'
	| 'sobreturno'
	| 'cancelar'
	| 'rac-enfermeria'
	| 'llamar-pantalla'
	| 'cerrar';

type OpcionMenu = {
	id: SlotMenuAction;
	label: string;
	mock?: boolean;
};

const OPCIONES_LIBRE: OpcionMenu[] = [
	{ id: 'asignar', label: 'Asignar turno' },
	{ id: 'sobreturno', label: 'Agregar sobreturno' },
	{ id: 'llamar-pantalla', label: 'Llamar por pantalla', mock: true },
];

const OPCIONES_OCUPADO_BASE: OpcionMenu[] = [
	{ id: 'cambiar', label: 'Cambiar turno', mock: true },
	{ id: 'sobreturno', label: 'Agregar sobreturno' },
	{ id: 'cancelar', label: 'Cancelar turno' },
	{ id: 'borrar', label: 'Borrar turno' },
	{ id: 'llamar-pantalla', label: 'Llamar por pantalla', mock: true },
	{ id: 'cerrar', label: 'Cerrar turno' },
];

interface Props {
	open: boolean;
	x: number;
	y: number;
	slot: AgendaSlot | null;
	puedeBorrar?: boolean;
	puedeRacEnfermeria?: boolean;
	onClose: () => void;
	onAction: (action: SlotMenuAction, slot: AgendaSlot) => void;
}

function esSlotLibre(slot: AgendaSlot): boolean {
	return slot.estado === 'LIBRE';
}

function esCancelado(slot: AgendaSlot): boolean {
	return slot.estado === 'CANCELADO' || slot.status === 1;
}

function esOcupado(slot: AgendaSlot): boolean {
	return slot.estado === 'OCUPADO' || slot.estado === 'ATENDIDO';
}

export default function SlotTurnoMenu({
	open,
	x,
	y,
	slot,
	puedeBorrar = false,
	puedeRacEnfermeria = false,
	onClose,
	onAction,
}: Props) {
	const ref = useRef<HTMLDivElement>(null);

	const opciones = useMemo(() => {
		if (!slot) return [];
		if (esSlotLibre(slot)) return OPCIONES_LIBRE;
		if (esCancelado(slot)) {
			return OPCIONES_LIBRE.filter((o) => o.id === 'asignar' || o.id === 'sobreturno');
		}
		const base = OPCIONES_OCUPADO_BASE.filter((o) => {
			if (o.id === 'borrar' && !puedeBorrar) return false;
			if (o.id === 'cancelar' && !slot.idTurno) return false;
			if (o.id === 'borrar' && !slot.idTurno) return false;
			if (o.id === 'cerrar') {
				if (!slot.idTurno) return false;
				if (slot.estado === 'ATENDIDO' || slot.horaAtencion) return false;
			}
			return true;
		});
		if (puedeRacEnfermeria && esOcupado(slot) && slot.idTurno) {
			return [
				{ id: 'rac-enfermeria' as const, label: 'RAC de enfermería' },
				...base,
			];
		}
		return base;
	}, [slot, puedeBorrar, puedeRacEnfermeria]);

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

	if (!open || !slot) return null;

	const offset = 6;
	const panelW = 240;
	const panelH = Math.min(360, 48 + opciones.length * 40);
	let left = x + offset;
	let top = y + offset;
	if (left + panelW > window.innerWidth - 8) left = x - panelW - offset;
	if (top + panelH > window.innerHeight - 8) top = y - panelH - offset;
	if (left < 8) left = 8;
	if (top < 8) top = 8;

	return createPortal(
		<div
			ref={ref}
			className={styles.panel}
			style={{ left, top }}
			role='menu'
			onMouseDown={(e) => e.stopPropagation()}
		>
			<div className={styles.header}>
				{slot.hora} · {slot.sector || '—'}
				{slot.pacienteNombre ? ` · ${slot.pacienteNombre}` : ''}
				{slot.esSobreturno ? ' · ST' : ''}
			</div>
			<ul className={styles.list}>
				{opciones.map((opt) => (
					<li key={opt.id}>
						<button
							type='button'
							className={`${styles.item} ${opt.mock ? styles.itemMock : ''}`}
							onClick={() => onAction(opt.id, slot)}
						>
							<span>{opt.label}</span>
							{opt.mock ? <span className={styles.mockTag}>próx.</span> : null}
						</button>
					</li>
				))}
			</ul>
		</div>,
		document.body,
	);
}
