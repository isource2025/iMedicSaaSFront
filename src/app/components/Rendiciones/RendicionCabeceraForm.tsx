'use client';

import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import InfoHint from '@/app/components/UI/InfoHint';
import type { CatalogosRendicion, DatosCabeceraRendicion } from '@/app/types/rendiciones';
import c from '@/app/components/Facturacion/Facturacion.module.css';

interface Props {
	valor: DatosCabeceraRendicion;
	onChange: (v: DatosCabeceraRendicion) => void;
	catalogos: CatalogosRendicion | null;
	disabled?: boolean;
	/** La rendición ya tiene prestaciones valorizadas: cliente, convenio y período quedan fijos. */
	soloObservaciones?: boolean;
}

export default function RendicionCabeceraForm({ valor, onChange, catalogos, disabled, soloObservaciones }: Props) {
	const set = <K extends keyof DatosCabeceraRendicion>(k: K, v: DatosCabeceraRendicion[K]) => onChange({ ...valor, [k]: v });
	const bloqueado = disabled || soloObservaciones;

	const opcionesCliente = [
		{ value: 0, label: 'Elegí el cliente' },
		...(catalogos?.clientes || []).map((o) => ({ value: o.valor, label: `${o.razonSocial} (${o.valor})` })),
	];
	const convenios = (catalogos?.convenios || []).filter((cv) => cv.obraSocial === valor.idCliente || cv.obraSocial === 0);
	const opcionesConvenio = [
		{ value: 0, label: valor.idCliente ? 'Elegí el convenio' : 'Elegí primero el cliente' },
		...convenios.map((cv) => ({
			value: cv.codigo,
			label: `#${cv.codigo} · ${cv.descripcion || 'Sin descripción'}${cv.obraSocial === 0 ? ' (general)' : ''}`,
		})),
	];

	return (
		<section className={c.formBloque}>
			<div className={c.formGrid}>
				<div className={c.span2}>
					<CustomSelect
						label='Cliente'
						name='rend-cliente'
						value={valor.idCliente}
						isLoading={!catalogos}
						disabled={bloqueado}
						onChange={(v) => {
							const idCliente = Number(v) || 0;
							const sigueValido = (catalogos?.convenios || []).some(
								(cv) => cv.codigo === valor.idConvenio && (cv.obraSocial === idCliente || cv.obraSocial === 0),
							);
							onChange({ ...valor, idCliente, idConvenio: sigueValido ? valor.idConvenio : 0 });
						}}
						options={opcionesCliente}
					/>
				</div>
				<div className={c.campo}>
					<label htmlFor='rend-periodo'>
						Período
						<InfoHint label='período' text='Mes que se rinde. Se guarda como el día 1 de ese mes, igual que el sistema de escritorio.' />
					</label>
					<input
						id='rend-periodo'
						type='month'
						className={c.input}
						value={valor.periodo}
						onChange={(e) => set('periodo', e.target.value)}
						disabled={bloqueado}
					/>
				</div>
				<div className={c.span3}>
					<CustomSelect
						label='Convenio'
						name='rend-convenio'
						value={valor.idConvenio}
						isLoading={!catalogos}
						disabled={bloqueado || !valor.idCliente}
						onChange={(v) => set('idConvenio', Number(v) || 0)}
						options={opcionesConvenio}
					/>
				</div>
				<div className={`${c.campo} ${c.span3}`}>
					<label htmlFor='rend-obs'>Observaciones</label>
					<textarea
						id='rend-obs'
						className={c.input}
						rows={3}
						maxLength={500}
						value={valor.observaciones}
						onChange={(e) => set('observaciones', e.target.value)}
						disabled={disabled}
						placeholder='Ej.: AMBULATORIOS, INTERNADOS…'
					/>
				</div>
			</div>
			{soloObservaciones ? (
				<p className={c.subtexto}>
					Cliente, convenio y período no se pueden cambiar: la rendición ya tiene prestaciones valorizadas con ese convenio.
				</p>
			) : null}
		</section>
	);
}
