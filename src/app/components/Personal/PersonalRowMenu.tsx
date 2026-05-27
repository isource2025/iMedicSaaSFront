'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Personal } from '@/app/types/personal';
import type { PersonalExtraKind } from './PersonalActionModals';
import styles from '../Agenda/SlotTurnoMenu.module.css';

export type PersonalMenuAction =
	| 'ver'
	| 'editar'
	| 'eliminar'
	| PersonalExtraKind;

type OpcionMenu = {
	id: PersonalMenuAction;
	label: string;
	danger?: boolean;
};

const OPCIONES_BASE: OpcionMenu[] = [
	{ id: 'ver', label: 'Ver detalles' },
	{ id: 'editar', label: 'Editar' },
];

const OPCIONES_EXTRA: OpcionMenu[] = [
	{ id: 'servicio', label: 'Servicio / facturación' },
	{ id: 'empresas', label: 'Empresas' },
	{ id: 'firma', label: 'Firma' },
	{ id: 'sectores', label: 'Sectores' },
	{ id: 'codigosFacturacion', label: 'Códigos de facturación' },
	{ id: 'rol', label: 'Rol del usuario' },
];

interface Props {
	open: boolean;
	x: number;
	y: number;
	personal: Personal | null;
	conExtras?: boolean;
	onClose: () => void;
	onAction: (action: PersonalMenuAction, personal: Personal) => void;
}

export default function PersonalRowMenu({
	open,
	x,
	y,
	personal,
	conExtras = false,
	onClose,
	onAction,
}: Props) {
	const ref = useRef<HTMLDivElement>(null);

	const opciones = useMemo(() => {
		const list = [...OPCIONES_BASE];
		if (conExtras) list.push(...OPCIONES_EXTRA);
		list.push({ id: 'eliminar', label: 'Eliminar', danger: true });
		return list;
	}, [conExtras]);

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

	if (!open || !personal) return null;

	const offset = 6;
	const panelW = 260;
	const panelH = Math.min(420, 48 + opciones.length * 40);
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
				{personal.ApellidoNombre} · ID {personal.Valor}
			</div>
			<ul className={styles.list}>
				{opciones.map((opt) => (
					<li key={opt.id}>
						<button
							type='button'
							className={`${styles.item} ${opt.danger ? styles.itemDanger : ''}`}
							onClick={() => onAction(opt.id, personal)}
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
