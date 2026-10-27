'use client';

import { useEffect, useId, useState } from 'react';
import { formatDMY, maskDMYInput, parseDMYToYMD } from '@/app/utils/admissionDatePeriod';
import styles from './DateInputDMY.module.css';

type Props = {
	/** Valor canónico yyyy-mm-dd (vacío = sin fecha). */
	value: string;
	onChange: (ymd: string) => void;
	min?: string;
	max?: string;
	className?: string;
	/** Clase extra sobre el contenedor (p. ej. ancho completo en formularios). */
	wrapClassName?: string;
	title?: string;
	id?: string;
	disabled?: boolean;
};

/**
 * Fecha visible como dd/mm/aaaa (Argentina).
 * El valor que emite es siempre yyyy-mm-dd para APIs / filtros.
 * Incluye un type=date oculto solo para abrir el calendario nativo.
 */
export default function DateInputDMY({
	value,
	onChange,
	min,
	max,
	className,
	wrapClassName,
	title,
	id,
	disabled,
}: Props) {
	const autoId = useId();
	const inputId = id || autoId;
	const [text, setText] = useState(() => (value ? formatDMY(value) : ''));

	useEffect(() => {
		setText(value ? formatDMY(value) : '');
	}, [value]);

	const clampYmd = (ymd: string): string => {
		if (min && ymd < min) return min;
		if (max && ymd > max) return max;
		return ymd;
	};

	const commit = (raw: string) => {
		const trimmed = raw.trim();
		if (!trimmed) {
			onChange('');
			setText('');
			return;
		}
		const parsed = parseDMYToYMD(trimmed);
		if (!parsed) {
			setText(value ? formatDMY(value) : '');
			return;
		}
		const next = clampYmd(parsed);
		onChange(next);
		setText(formatDMY(next));
	};

	return (
		<span className={`${styles.wrap} ${wrapClassName || ''}`.trim()}>
			<input
				id={inputId}
				type="text"
				inputMode="numeric"
				autoComplete="off"
				placeholder="dd/mm/aaaa"
				className={`${styles.text} ${className || ''}`.trim()}
				value={text}
				title={title}
				disabled={disabled}
				aria-label={title}
				onChange={(e) => setText(maskDMYInput(e.target.value))}
				onBlur={() => commit(text)}
				onKeyDown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						commit(text);
					}
				}}
			/>
			<input
				type="date"
				className={styles.native}
				tabIndex={-1}
				aria-hidden
				disabled={disabled}
				value={value || ''}
				min={min || undefined}
				max={max || undefined}
				title="Abrir calendario"
				onChange={(e) => {
					const ymd = e.target.value;
					if (!ymd) {
						onChange('');
						setText('');
						return;
					}
					const next = clampYmd(ymd);
					onChange(next);
					setText(formatDMY(next));
				}}
			/>
		</span>
	);
}
