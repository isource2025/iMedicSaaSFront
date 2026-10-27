'use client';

import { useEffect, useState } from 'react';
import Modal from '@/app/components/UI/Modal';
import { useToast } from '@/app/components/UI/ToastProvider';
import { conveniosService, detallesDeError } from '@/app/services/conveniosService';
import { mensajeDeError } from '@/app/utils/apiError';
import type { CabeceraConvenio, CatalogosConvenio } from '@/app/types/convenios';
import ConvenioCabeceraForm from './ConvenioCabeceraForm';
import { cabeceraVacia } from './conveniosFormato';
import c from '@/app/components/Facturacion/Facturacion.module.css';

interface Props {
	open: boolean;
	catalogos: CatalogosConvenio | null;
	/** Obra social preseleccionada (la del filtro del listado). */
	obraSocial?: number | '';
	onClose: () => void;
	onCreado: (codigo: number) => void;
}

export default function ConvenioNuevoModal({ open, catalogos, obraSocial, onClose, onCreado }: Props) {
	const toast = useToast();
	const [valor, setValor] = useState<CabeceraConvenio>(cabeceraVacia);
	const [guardando, setGuardando] = useState(false);
	const [error, setError] = useState<{ mensaje: string; detalles: string[] } | null>(null);

	useEffect(() => {
		if (!open) return;
		setValor({ ...cabeceraVacia(), Valor: obraSocial === '' || obraSocial === undefined ? 0 : obraSocial });
		setError(null);
	}, [open, obraSocial]);

	const crear = async () => {
		setGuardando(true);
		setError(null);
		try {
			const r = await conveniosService.crear(valor);
			toast.success(`Convenio #${r.codigo} creado. Ahora podés cargarle valores y prácticas.`);
			onCreado(r.codigo);
		} catch (e) {
			setError({ mensaje: mensajeDeError(e, 'No se pudo crear el convenio'), detalles: detallesDeError(e) });
		} finally {
			setGuardando(false);
		}
	};

	return (
		<Modal isOpen={open} onClose={() => !guardando && onClose()} title='Nuevo convenio' size='large'>
			<ConvenioCabeceraForm valor={valor} onChange={setValor} catalogos={catalogos} disabled={guardando} />
			{error ? (
				<div className={c.error} role='alert' style={{ marginTop: 12 }}>
					{error.mensaje}
					{error.detalles.length > 1 ? (
						<ul className={c.errorList}>
							{error.detalles.map((d) => (
								<li key={d}>{d}</li>
							))}
						</ul>
					) : null}
				</div>
			) : null}
			<div className={c.footer} style={{ marginTop: 12 }}>
				<button type='button' className={c.btnGhost} onClick={onClose} disabled={guardando}>
					Cancelar
				</button>
				<button type='button' className={c.btnPrimary} onClick={crear} disabled={guardando || !valor.Descripcion.trim()}>
					{guardando ? 'Creando…' : 'Crear convenio'}
				</button>
			</div>
		</Modal>
	);
}
