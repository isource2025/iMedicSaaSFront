'use client';

import { useEffect, useState } from 'react';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import Modal from '@/app/components/UI/Modal';
import { useToast } from '@/app/components/UI/ToastProvider';
import { conveniosService, detallesDeError } from '@/app/services/conveniosService';
import { mensajeDeError } from '@/app/utils/apiError';
import type { CatalogosConvenio, ConvenioDetalle } from '@/app/types/convenios';
import { fmtNumero, hoyIso } from '@/app/components/Facturacion/formato';
import c from '@/app/components/Facturacion/Facturacion.module.css';

interface Props {
	open: boolean;
	convenio: ConvenioDetalle;
	catalogos: CatalogosConvenio;
	onClose: () => void;
	onDuplicado: (codigo: number) => void;
}

export default function ConvenioDuplicarModal({ open, convenio, catalogos, onClose, onDuplicado }: Props) {
	const toast = useToast();
	const [descripcion, setDescripcion] = useState('');
	const [obraSocial, setObraSocial] = useState(0);
	const [desde, setDesde] = useState('');
	const [hasta, setHasta] = useState('');
	const [ajuste, setAjuste] = useState('');
	const [guardando, setGuardando] = useState(false);
	const [error, setError] = useState<{ mensaje: string; detalles: string[] } | null>(null);

	useEffect(() => {
		if (!open) return;
		setDescripcion(`Copia de ${convenio.descripcion}`.slice(0, 40));
		setObraSocial(convenio.obraSocial.valor);
		setDesde(hoyIso());
		setHasta('');
		setAjuste('');
		setError(null);
	}, [open, convenio]);

	const total = catalogos.pestanas.reduce((a, p) => a + (convenio.conteos[p.id] || 0), 0);

	const duplicar = async () => {
		setGuardando(true);
		setError(null);
		try {
			const r = await conveniosService.duplicar(convenio.codigo, {
				descripcion,
				obraSocial,
				vigenciaDesde: desde || null,
				vigenciaHasta: hasta || null,
				ajustePorcentaje: ajuste.trim() || null,
			});
			toast.success(`Convenio #${r.codigo} creado como copia de #${convenio.codigo}.`);
			onDuplicado(r.codigo);
		} catch (e) {
			setError({ mensaje: mensajeDeError(e, 'No se pudo duplicar el convenio'), detalles: detallesDeError(e) });
		} finally {
			setGuardando(false);
		}
	};

	return (
		<Modal isOpen={open} onClose={() => !guardando && onClose()} title={`Duplicar convenio #${convenio.codigo}`} size='large'>
			<div className={c.modalBody}>
				<p className={c.info}>
					Crea un convenio nuevo con los mismos datos generales y una copia de todas sus filas ({fmtNumero(total)}). Útil para armar el
					convenio del período siguiente y aplicarle un aumento.
				</p>
				<section className={c.formBloque}>
					<div className={c.formGrid}>
						<div className={`${c.campo} ${c.span2}`}>
							<label htmlFor='dup-desc'>Descripción del nuevo convenio</label>
							<input id='dup-desc' className={c.input} value={descripcion} maxLength={40} onChange={(e) => setDescripcion(e.target.value)} autoFocus />
						</div>
						<div className={c.campo}>
							<label htmlFor='dup-aj'>Ajuste % (opcional)</label>
							<input id='dup-aj' className={c.input} inputMode='decimal' value={ajuste} onChange={(e) => setAjuste(e.target.value)} placeholder='Ej.: 8' />
						</div>
						<div className={c.span3}>
							<CustomSelect
								label='Obra social'
								name='dup-os'
								value={obraSocial}
								isLoading={false}
								onChange={(v) => setObraSocial(Number(v))}
								options={catalogos.obrasSociales.map((o) => ({ value: o.valor, label: o.razonSocial }))}
							/>
						</div>
						<div className={c.campo}>
							<label htmlFor='dup-desde'>Vigencia desde</label>
							<input id='dup-desde' type='date' className={c.input} value={desde} onChange={(e) => setDesde(e.target.value)} />
						</div>
						<div className={c.campo}>
							<label htmlFor='dup-hasta'>Vigencia hasta</label>
							<input id='dup-hasta' type='date' className={c.input} value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
						</div>
					</div>
				</section>
				{error ? (
					<div className={c.error} role='alert'>
						{error.mensaje}
						{error.detalles.length ? (
							<ul className={c.errorList}>
								{error.detalles.map((d) => (
									<li key={d}>{d}</li>
								))}
							</ul>
						) : null}
					</div>
				) : null}
				<div className={c.footer}>
					<button type='button' className={c.btnGhost} onClick={onClose} disabled={guardando}>
						Cancelar
					</button>
					<button type='button' className={c.btnPrimary} onClick={duplicar} disabled={guardando || !descripcion.trim()}>
						{guardando ? 'Duplicando…' : 'Duplicar'}
					</button>
				</div>
			</div>
		</Modal>
	);
}
