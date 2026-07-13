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
	| 'marcar-llegada'
	| 'marcar-ingreso'
	| 'atender'
	| 'ver-detalle'
	| 'llamar-pantalla'
	| 'cerrar';

type OpcionMenu = {
	id: SlotMenuAction;
	label: string;
	mock?: boolean;
	flowNext?: boolean;
};

const OPCIONES_LIBRE: OpcionMenu[] = [
	{ id: 'asignar', label: 'Asignar turno' },
	{ id: 'sobreturno', label: 'Agregar sobreturno' },
];

const OPCIONES_OCUPADO_BASE: OpcionMenu[] = [
	{ id: 'marcar-llegada', label: 'Marcar llegada' },
	{ id: 'marcar-ingreso', label: 'Ingresó a consultorio' },
	{ id: 'atender', label: 'Atender / Cerrar turno' },
	{ id: 'cambiar', label: 'Cambiar turno', mock: true },
	{ id: 'sobreturno', label: 'Agregar sobreturno' },
	{ id: 'cancelar', label: 'Cancelar turno' },
	{ id: 'borrar', label: 'Borrar turno' },
	{ id: 'llamar-pantalla', label: 'Llamar por pantalla' },
];

interface Props {
	open: boolean;
	x: number;
	y: number;
	slot: AgendaSlot | null;
	puedeBorrar?: boolean;
	puedeRacEnfermeria?: boolean;
	puedeAtender?: boolean;
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

function turnoTieneDatosAtencion(slot: AgendaSlot): boolean {
	return (
		slot.estado === 'ATENDIDO' ||
		Boolean(slot.horaSalida) ||
		Boolean(slot.horaLlegada) ||
		Boolean(slot.horaIngreso) ||
		slot.idClasificacionTriage != null ||
		(Number(slot.racControles) || 0) > 0 ||
		(Number(slot.racMedicacion) || 0) > 0
	);
}

function getFlowNextAction(slot: AgendaSlot): SlotMenuAction | null {
	if (!slot.idTurno || slot.estado === 'ATENDIDO' || slot.horaSalida) return null;
	if (!slot.horaLlegada) return 'marcar-llegada';
	if (!slot.horaIngreso) return 'marcar-ingreso';
	return 'atender';
}

export default function SlotTurnoMenu({
	open,
	x,
	y,
	slot,
	puedeBorrar = false,
	puedeRacEnfermeria = false,
	puedeAtender = true,
	onClose,
	onAction,
}: Props) {
	const ref = useRef<HTMLDivElement>(null);

	const opciones = useMemo((): OpcionMenu[] => {
		if (!slot) return [];
		if (esSlotLibre(slot)) return OPCIONES_LIBRE;
		if (esCancelado(slot)) {
			return OPCIONES_LIBRE.filter((o) => o.id === 'asignar' || o.id === 'sobreturno');
		}

		const flowNext = getFlowNextAction(slot);
		const cerrado = slot.estado === 'ATENDIDO' || Boolean(slot.horaSalida);
		const base = OPCIONES_OCUPADO_BASE.filter((o) => {
			if (o.id === 'borrar' && !puedeBorrar) return false;
			if (o.id === 'cancelar' && !slot.idTurno) return false;
			if (o.id === 'borrar' && !slot.idTurno) return false;
			// Una vez cerrada la atención no se puede cancelar, cambiar ni llamar por pantalla
			if (cerrado && (o.id === 'cancelar' || o.id === 'cambiar' || o.id === 'llamar-pantalla'))
				return false;
			// Llamar por pantalla solo si el paciente ya registró llegada
			if (o.id === 'llamar-pantalla' && !slot.horaLlegada) return false;
			if (o.id === 'marcar-llegada' && slot.horaLlegada) return false;
			if (o.id === 'marcar-ingreso' && (!slot.horaLlegada || slot.horaIngreso)) return false;
			if (o.id === 'atender') {
				if (!puedeAtender || !slot.idTurno) return false;
				if (cerrado) return false;
				if (!slot.horaLlegada || !slot.horaIngreso) return false;
			}
			return true;
		}).map((o) => ({
			...o,
			flowNext: flowNext != null && o.id === flowNext,
		}));

		const conDetalle: OpcionMenu[] = turnoTieneDatosAtencion(slot)
			? [{ id: 'ver-detalle', label: 'Ver detalle de atención' }]
			: [];

		const merged: OpcionMenu[] = [...conDetalle, ...base];

		// El RAC de enfermería solo se habilita si el paciente ya registró llegada
		if (puedeRacEnfermeria && esOcupado(slot) && slot.idTurno && slot.horaLlegada) {
			return [{ id: 'rac-enfermeria', label: 'RAC de enfermería' }, ...merged];
		}
		return merged;
	}, [slot, puedeBorrar, puedeRacEnfermeria, puedeAtender]);

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
							className={`${styles.item} ${opt.mock ? styles.itemMock : ''} ${opt.flowNext ? styles.itemFlowNext : ''}`}
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
