'use client';

import { useEffect, useState } from 'react';
import {
	agendaService,
	type TipoPedidoEstudio,
} from '@/app/services/agendaService';
import styles from './AtencionTurnoModal.module.css';

interface Props {
	id: string;
	label: string;
	placeholder?: string;
	excluirIds?: number[];
	onSelect: (tipo: TipoPedidoEstudio) => void;
}

export default function TipoPedidoEstudioPicker({
	id,
	label,
	placeholder = 'Buscar por descripción o código…',
	excluirIds = [],
	onSelect,
}: Props) {
	const [term, setTerm] = useState('');
	const [results, setResults] = useState<TipoPedidoEstudio[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const t = term.trim();
		if (t.length < 2) {
			setResults([]);
			return;
		}
		let cancel = false;
		setLoading(true);
		const handle = setTimeout(async () => {
			try {
				const rows = await agendaService.buscarTiposPedidosEstudios(t, 25);
				if (!cancel) {
					const excl = new Set(excluirIds);
					setResults(rows.filter((r) => !excl.has(r.idTipoPedido)));
				}
			} catch {
				if (!cancel) setResults([]);
			} finally {
				if (!cancel) setLoading(false);
			}
		}, 280);
		return () => {
			cancel = true;
			clearTimeout(handle);
		};
	}, [term, excluirIds]);

	const handlePick = (tipo: TipoPedidoEstudio) => {
		onSelect(tipo);
		setTerm('');
		setResults([]);
	};

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
			{results.length > 0 ? (
				<div className={styles.diagResults}>
					{results.map((r) => (
						<button
							key={r.idTipoPedido}
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
			{term.trim().length >= 2 && !loading && results.length === 0 ? (
				<p className={styles.empty}>Sin resultados.</p>
			) : null}
		</div>
	);
}
