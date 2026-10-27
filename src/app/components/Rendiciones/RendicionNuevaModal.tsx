'use client';

import { useEffect, useState } from 'react';
import Modal from '@/app/components/UI/Modal';
import { useToast } from '@/app/components/UI/ToastProvider';
import { rendicionesService } from '@/app/services/rendicionesService';
import { mensajeDeError } from '@/app/utils/apiError';
import type { CatalogosRendicion, DatosCabeceraRendicion } from '@/app/types/rendiciones';
import { mesActual } from '@/app/components/Facturacion/formato';
import RendicionCabeceraForm from './RendicionCabeceraForm';
import c from '@/app/components/Facturacion/Facturacion.module.css';

interface Props {
	open: boolean;
	catalogos: CatalogosRendicion | null;
	/** Cliente preseleccionado (el del filtro del listado). */
	cliente?: number | '';
	onClose: () => void;
	onCreada: (id: number) => void;
}

const vacia = (cliente?: number | ''): DatosCabeceraRendicion => ({
	idCliente: cliente === '' || cliente === undefined ? 0 : cliente,
	idConvenio: 0,
	periodo: mesActual(),
	observaciones: '',
});

export default function RendicionNuevaModal({ open, catalogos, cliente, onClose, onCreada }: Props) {
	const toast = useToast();
	const [valor, setValor] = useState<DatosCabeceraRendicion>(() => vacia());
	const [guardando, setGuardando] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setValor(vacia(cliente));
		setError(null);
	}, [open, cliente]);

	const completo = valor.idCliente > 0 && valor.idConvenio > 0 && /^\d{4}-\d{2}$/.test(valor.periodo);

	const crear = async () => {
		setGuardando(true);
		setError(null);
		try {
			const r = await rendicionesService.crear(valor);
			toast.success(`Rendición #${r.id} creada.`);
			onCreada(r.id);
		} catch (e) {
			setError(mensajeDeError(e, 'No se pudo crear la rendición'));
		} finally {
			setGuardando(false);
		}
	};

	return (
		<Modal isOpen={open} onClose={() => !guardando && onClose()} title='Nueva rendición' size='large'>
			<div className={c.modalBody}>
				<p className={c.info}>
					Se crea la cabecera vacía. Las visitas y sus prestaciones valorizadas las agrega el sistema de escritorio al rendir.
				</p>
				<RendicionCabeceraForm valor={valor} onChange={setValor} catalogos={catalogos} disabled={guardando} />
				{error ? (
					<p className={c.error} role='alert'>
						{error}
					</p>
				) : null}
				<div className={c.footer}>
					<button type='button' className={c.btnGhost} onClick={onClose} disabled={guardando}>
						Cancelar
					</button>
					<button type='button' className={c.btnPrimary} onClick={crear} disabled={guardando || !completo}>
						{guardando ? 'Creando…' : 'Crear rendición'}
					</button>
				</div>
			</div>
		</Modal>
	);
}
