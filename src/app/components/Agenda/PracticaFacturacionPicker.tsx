'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
	agendaService,
	type PracticaFacturacion,
} from '@/app/services/agendaService';
import styles from './AtencionTurnoModal.module.css';

const EMPTY_EXCLUIR: number[] = [];
const DEBOUNCE_MS = 2000;
const MIN_CHARS = 2;

interface Props {
	id: string;
	label: string;
	placeholder?: string;
	/** Excluir por idPractica ya agregados. */
	excluirIds?: number[];
	onSelect: (practica: PracticaFacturacion) => void;
}

/**
 * Busca prácticas en nomenclador/moduladas (imNomenclador / imModuladas).
 * Usado en el paso Procedimientos del cierre de atención (no confundir con tipos de pedidos de estudios).
 */
export default function PracticaFacturacionPicker({
	id,
	label,
	placeholder = 'Buscar por código o descripción…',
	excluirIds = EMPTY_EXCLUIR,
	onSelect,
}: Props) {
	const [term, setTerm] = useState('');
	const [results, setResults] = useState<PracticaFacturacion[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchedTerm, setSearchedTerm] = useState('');
	const reqIdRef = useRef(0);

	const exclKey = useMemo(
		() =>
			excluirIds
				.map(Number)
				.filter((n) => Number.isFinite(n) && n > 0)
				.sort((a, b) => a - b)
				.join(','),
		[excluirIds],
	);

	useEffect(() => {
		const t = term.trim();
		if (t.length < MIN_CHARS) {
			reqIdRef.current += 1;
			setResults([]);
			setLoading(false);
			setSearchedTerm('');
			return;
		}

		setLoading(false);
		const handle = setTimeout(async () => {
			const reqId = ++reqIdRef.current;
			setLoading(true);
			try {
				const rows = await agendaService.buscarPracticasFacturacion(t, 25);
				if (reqId !== reqIdRef.current) return;
				const excl = new Set(
					exclKey ? exclKey.split(',').map((x) => Number(x)) : [],
				);
				setResults(rows.filter((r) => !excl.has(r.idPractica)));
				setSearchedTerm(t);
			} catch {
				if (reqId !== reqIdRef.current) return;
				setResults([]);
				setSearchedTerm(t);
			} finally {
				if (reqId === reqIdRef.current) setLoading(false);
			}
		}, DEBOUNCE_MS);

		return () => {
			clearTimeout(handle);
		};
	}, [term, exclKey]);

	const handlePick = (practica: PracticaFacturacion) => {
		reqIdRef.current += 1;
		onSelect(practica);
		setTerm('');
		setResults([]);
		setSearchedTerm('');
		setLoading(false);
	};

	const trimmed = term.trim();
	const waitingDebounce =
		trimmed.length >= MIN_CHARS && !loading && searchedTerm !== trimmed;
	const showEmpty =
		trimmed.length >= MIN_CHARS &&
		!loading &&
		!waitingDebounce &&
		searchedTerm === trimmed &&
		results.length === 0;

	return (
		<div className={styles.field}>
			<label htmlFor={id}>{label}</label>
			<div className={styles.diagInputWrap}>
				<input
					id={id}
					type='text'
					value={term}
					onChange={(e) => setTerm(e.target.value)}
					placeholder={placeholder}
					autoComplete='off'
				/>
				{loading ? (
					<span className={styles.diagSpinner} aria-label='Buscando' />
				) : null}
			</div>
			{waitingDebounce ? (
				<p className={styles.empty}>Pausá un momento para buscar…</p>
			) : null}
			{results.length > 0 ? (
				<div className={styles.diagResults}>
					{results.map((r) => (
						<button
							key={`${r.tipoPractica}-${r.idPractica}`}
							type='button'
							className={styles.diagRow}
							onClick={() => handlePick(r)}
						>
							<span className={styles.diagCode}>{r.idPractica}</span>
							<span>{r.descripcion}</span>
						</button>
					))}
				</div>
			) : null}
			{showEmpty ? <p className={styles.empty}>Sin resultados.</p> : null}
		</div>
	);
}
