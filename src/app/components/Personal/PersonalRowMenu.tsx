'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Personal } from '@/app/types/personal';
import type { PersonalExtraKind } from './PersonalActionModals';
import styles from './PersonalRowMenu.module.css';

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
	{ id: 'editar', label: 'Editar ficha' },
];

const OPCIONES_EXTRA: OpcionMenu[] = [
	{ id: 'cuenta', label: 'Cuenta de acceso' },
	{ id: 'servicio', label: 'Servicio / facturación' },
	{ id: 'empresas', label: 'Empresas' },
	{ id: 'firma', label: 'Firma digital' },
	{ id: 'sectores', label: 'Sectores' },
	{ id: 'codigosFacturacion', label: 'Códigos de facturación' },
	{ id: 'rol', label: 'Roles del usuario' },
];

interface Props {
	open: boolean;
	/** 'sheet' = panel inferior (mobile). 'context' = menú flotante (desktop). */
	variant?: 'context' | 'sheet';
	x?: number;
	y?: number;
	personal: Personal | null;
	conExtras?: boolean;
	onClose: () => void;
	onAction: (action: PersonalMenuAction, personal: Personal) => void;
}

function MenuOptions({
	opciones,
	personal,
	onAction,
	itemClassName,
}: {
	opciones: OpcionMenu[];
	personal: Personal;
	onAction: (action: PersonalMenuAction, personal: Personal) => void;
	itemClassName: string;
}) {
	return (
		<>
			{opciones.map((opt) => (
				<li key={opt.id}>
					<button
						type='button'
						className={`${itemClassName} ${opt.danger ? styles.itemDanger : ''}`}
						onClick={() => onAction(opt.id, personal)}
					>
						<span>{opt.label}</span>
					</button>
				</li>
			))}
		</>
	);
}

export default function PersonalRowMenu({
	open,
	variant = 'context',
	x = 0,
	y = 0,
	personal,
	conExtras = true,
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
		const onDown = (e: MouseEvent | TouchEvent) => {
			const target = e.target as Node;
			if (ref.current && !ref.current.contains(target)) onClose();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		document.addEventListener('mousedown', onDown);
		document.addEventListener('touchstart', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDown);
			document.removeEventListener('touchstart', onDown);
			document.removeEventListener('keydown', onKey);
		};
	}, [open, onClose]);

	useEffect(() => {
		if (!open || variant !== 'sheet') return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	}, [open, variant]);

	if (!open || !personal) return null;

	if (variant === 'sheet') {
		return createPortal(
			<>
				<div className={styles.backdrop} onClick={onClose} aria-hidden />
				<div
					ref={ref}
					className={styles.sheet}
					role='dialog'
					aria-modal='true'
					aria-label={`Opciones para ${personal.ApellidoNombre}`}
				>
					<div className={styles.sheetHandle} aria-hidden />
					<div className={styles.sheetHeader}>
						<h3 className={styles.sheetTitle}>{personal.ApellidoNombre}</h3>
						<p className={styles.sheetMeta}>ID {personal.Valor}</p>
					</div>
					<ul className={styles.sheetList}>
						<MenuOptions
							opciones={opciones}
							personal={personal}
							onAction={onAction}
							itemClassName={styles.item}
						/>
					</ul>
					<button type='button' className={styles.sheetCancel} onClick={onClose}>
						Cancelar
					</button>
				</div>
			</>,
			document.body,
		);
	}

	const offset = 6;
	const panelW = 260;
	const panelH = Math.min(420, 48 + opciones.length * 44);
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
				<MenuOptions
					opciones={opciones}
					personal={personal}
					onAction={onAction}
					itemClassName={styles.item}
				/>
			</ul>
		</div>,
		document.body,
	);
}
