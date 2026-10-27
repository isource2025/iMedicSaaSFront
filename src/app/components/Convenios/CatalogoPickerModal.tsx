'use client';

import { useEffect, useState } from 'react';
import { Check, Search } from 'lucide-react';
import Modal from '@/app/components/UI/Modal';
import { conveniosService } from '@/app/services/conveniosService';
import { mensajeDeError } from '@/app/utils/apiError';
import type { ResultadoCatalogo } from '@/app/types/convenios';
import c from '@/app/components/Facturacion/Facturacion.module.css';

export type TipoCatalogo = 'nomenclador' | 'moduladas' | 'vademecum';

const TITULOS: Record<TipoCatalogo, string> = {
	nomenclador: 'Agregar prácticas del nomenclador',
	moduladas: 'Agregar prácticas moduladas',
	vademecum: 'Agregar medicamentos del vademécum',
};

interface Props {
	open: boolean;
	tipo: TipoCatalogo;
	onClose: () => void;
	/** Se llama por cada resultado elegido; el modal queda abierto para seguir agregando. */
	onElegir: (r: ResultadoCatalogo) => void;
}

export default function CatalogoPickerModal({ open, tipo, onClose, onElegir }: Props) {
	const [q, setQ] = useState('');
	const [resultados, setResultados] = useState<ResultadoCatalogo[]>([]);
	const [buscando, setBuscando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [agregados, setAgregados] = useState<Set<number>>(new Set());

	useEffect(() => {
		if (!open) {
			setQ('');
			setResultados([]);
			setAgregados(new Set());
			setError(null);
		}
	}, [open]);

	useEffect(() => {
		const termino = q.trim();
		if (!open || (termino.length < 2 && !/^\d+$/.test(termino))) {
			setResultados([]);
			return;
		}
		let vigente = true;
		const t = setTimeout(async () => {
			setBuscando(true);
			setError(null);
			try {
				const r = await conveniosService.buscarEnCatalogo(tipo, termino);
				if (vigente) setResultados(r);
			} catch (e) {
				if (vigente) setError(mensajeDeError(e, 'No se pudo buscar en el catálogo'));
			} finally {
				if (vigente) setBuscando(false);
			}
		}, 300);
		return () => {
			vigente = false;
			clearTimeout(t);
		};
	}, [q, tipo, open]);

	const elegir = (r: ResultadoCatalogo) => {
		onElegir(r);
		setAgregados((prev) => new Set(prev).add(r.codigo));
	};

	return (
		<Modal isOpen={open} onClose={onClose} title={TITULOS[tipo]} size='medium' priority='high'>
			<div className={c.modalBody}>
				<div className={c.campo}>
					<label htmlFor='picker-q'>{tipo === 'vademecum' ? 'Troquel o nombre' : 'Código o descripción'}</label>
					<input
						id='picker-q'
						className={c.input}
						value={q}
						autoFocus
						onChange={(e) => setQ(e.target.value)}
						placeholder={tipo === 'vademecum' ? 'Ej.: ibuprofeno' : 'Ej.: 420101 o consulta'}
					/>
				</div>
				{error ? <p className={c.error}>{error}</p> : null}
				{buscando ? (
					<div className={c.loading}>
						<span className={c.spinner} aria-hidden /> Buscando…
					</div>
				) : resultados.length ? (
					<div className={c.resultados} role='listbox' aria-label='Resultados'>
						{resultados.map((r) => {
							const ya = agregados.has(r.codigo);
							return (
								<button key={r.codigo} type='button' className={c.resultado} onClick={() => elegir(r)} disabled={ya}>
									<span>
										<span className={c.resultadoNombre}>{r.descripcion || '(sin descripción)'}</span>
										{r.detalle ? <span className={c.resultadoMeta}>{r.detalle}</span> : null}
									</span>
									<span className={c.resultadoCodigo}>
										{ya ? <Check size={16} aria-label='Agregado' /> : r.codigo}
									</span>
								</button>
							);
						})}
					</div>
				) : q.trim() ? (
					<p className={c.empty}>Sin resultados.</p>
				) : (
					<p className={c.empty}>
						<Search size={16} aria-hidden /> Escribí al menos 2 letras o un código.
					</p>
				)}
				<div className={c.footer}>
					<span className={c.footerInfo}>
						{agregados.size ? `${agregados.size} agregada${agregados.size === 1 ? '' : 's'} a la grilla` : 'Cada elección agrega una fila nueva.'}
					</span>
					<button type='button' className={c.btnPrimary} onClick={onClose}>
						Listo
					</button>
				</div>
			</div>
		</Modal>
	);
}
