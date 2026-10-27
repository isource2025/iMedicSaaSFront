'use client';

import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import InfoHint from '@/app/components/UI/InfoHint';
import type { CabeceraConvenio, CatalogosConvenio } from '@/app/types/convenios';
import { A_CONFIRMAR } from './conveniosFormato';
import { textoImporte } from './grillaConvenio';
import c from '@/app/components/Facturacion/Facturacion.module.css';

interface Props {
	valor: CabeceraConvenio;
	onChange: (v: CabeceraConvenio) => void;
	catalogos: CatalogosConvenio | null;
	disabled?: boolean;
}

const OPCIONES_APLICA = [
	{ value: '', label: '(vacío)' },
	{ value: 'U', label: 'U' },
	{ value: 'F', label: 'F' },
];

const OPCIONES_SOBRE = [
	{ value: '', label: '(vacío)' },
	{ value: 'G+H', label: 'G+H' },
	{ value: 'GAS', label: 'GAS' },
];

/** Agrega el valor actual a las opciones si vino de la base con algo que no está en la lista. */
const conActual = (ops: { value: string; label: string }[], actual: string | null) =>
	actual && !ops.some((o) => o.value === actual) ? [...ops, { value: actual, label: actual }] : ops;

export default function ConvenioCabeceraForm({ valor, onChange, catalogos, disabled = false }: Props) {
	const set = <K extends keyof CabeceraConvenio>(k: K, v: CabeceraConvenio[K]) => onChange({ ...valor, [k]: v });
	const num = (k: keyof CabeceraConvenio) => ({
		value: valor[k] === null || valor[k] === undefined ? '' : String(valor[k]),
		onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
			set(k, (e.target.value === '' ? null : e.target.value) as never),
	});
	/** Importe con 2 decimales; lo escrito se normaliza al salir del campo. */
	const importe = (k: keyof CabeceraConvenio) => {
		const v = valor[k];
		return {
			...num(k),
			value: typeof v === 'number' ? textoImporte(v) : v === null || v === undefined ? '' : String(v),
			onBlur: () => {
				if (typeof v === 'string' && v.trim() && textoImporte(v) !== v) set(k, textoImporte(v) as never);
			},
		};
	};

	const obrasSociales = (catalogos?.obrasSociales || []).map((o) => ({ value: o.valor, label: o.razonSocial }));
	const categorias = [
		{ value: 0, label: 'Sin categoría' },
		...(catalogos?.categorias || []).map((x) => ({ value: x.valor, label: x.descripcion })),
	];

	return (
		<div className={c.modalBody}>
			<section className={c.formBloque}>
				<h4 className={c.formBloqueTitulo}>Identificación</h4>
				<div className={c.formGrid}>
					<div className={`${c.campo} ${c.span2}`}>
						<label htmlFor='conv-desc'>Descripción</label>
						<input
							id='conv-desc'
							className={c.input}
							value={valor.Descripcion}
							maxLength={40}
							disabled={disabled}
							onChange={(e) => set('Descripcion', e.target.value)}
							placeholder='Ej.: Abril 2026'
						/>
					</div>
					<div className={c.campo}>
						<span className={c.campoLabel}>Multiconvenio</span>
						<label className={c.check}>
							<input
								type='checkbox'
								checked={Number(valor.MultiConvenio) === 1}
								disabled={disabled}
								onChange={(e) => set('MultiConvenio', e.target.checked ? 1 : 0)}
							/>
							Convive con otros convenios de la obra social
						</label>
					</div>
					<div className={c.span3}>
						<CustomSelect
							label='Obra social'
							name='conv-os'
							value={valor.Valor}
							isLoading={!catalogos}
							disabled={disabled}
							onChange={(v) => set('Valor', Number(v))}
							options={obrasSociales}
						/>
					</div>
					<div className={c.campo}>
						<label htmlFor='conv-desde'>Vigencia desde</label>
						<input
							id='conv-desde'
							type='date'
							className={c.input}
							value={valor.VigenciaDesde || ''}
							disabled={disabled}
							onChange={(e) => set('VigenciaDesde', e.target.value || null)}
						/>
					</div>
					<div className={c.campo}>
						<label htmlFor='conv-hasta'>Vigencia hasta</label>
						<input
							id='conv-hasta'
							type='date'
							className={c.input}
							value={valor.VigenciaHasta || ''}
							min={valor.VigenciaDesde || undefined}
							disabled={disabled}
							onChange={(e) => set('VigenciaHasta', e.target.value || null)}
						/>
					</div>
					<div className={c.campo}>
						<CustomSelect
							label='Categoría profesional'
							name='conv-cat'
							value={valor.CatProfesional ?? 0}
							isLoading={!catalogos}
							disabled={disabled}
							onChange={(v) => set('CatProfesional', Number(v))}
							options={categorias}
						/>
					</div>
				</div>
			</section>

			<section className={c.formBloque}>
				<h4 className={c.formBloqueTitulo}>Coberturas</h4>
				<div className={c.formGrid}>
					{(
						[
							['CoberturaHonorarios', 'Honorarios'],
							['CoberturaGastos', 'Gastos'],
							['CoberturaMedicamentos', 'Medicamentos'],
							['CoberturaDescartables', 'Descartables'],
						] as const
					).map(([k, label]) => (
						<div key={k} className={c.campo}>
							<label htmlFor={`conv-${k}`}>
								{label}
								<InfoHint label={`cobertura de ${label.toLowerCase()}`} text='Hoy la mayoría está en 100. A confirmar con facturación si es un porcentaje.' />
							</label>
							<input id={`conv-${k}`} className={c.input} inputMode='decimal' disabled={disabled} {...importe(k)} />
						</div>
					))}
					<div className={c.campo}>
						<label htmlFor='conv-tipovalor'>
							Tipo de valor
							<InfoHint label='tipo de valor' text={A_CONFIRMAR} />
						</label>
						<input id='conv-tipovalor' className={c.input} inputMode='numeric' disabled={disabled} {...num('TipoValor')} />
					</div>
				</div>
			</section>

			<section className={c.formBloque}>
				<h4 className={c.formBloqueTitulo}>Medicamentos y descartables</h4>
				<div className={c.formGrid}>
					<div className={c.campo}>
						<label htmlFor='conv-precio'>Precio medicamentos</label>
						<input id='conv-precio' className={c.input} inputMode='decimal' disabled={disabled} {...importe('PrecioMedicamentos')} />
					</div>
					<div className={c.campo}>
						<label htmlFor='conv-aplica'>
							Aplica precio
							<InfoHint label='aplica precio de medicamentos' text={A_CONFIRMAR} />
						</label>
						<select
							id='conv-aplica'
							className={c.select}
							value={valor.AplicaPrecioMed || ''}
							disabled={disabled}
							onChange={(e) => set('AplicaPrecioMed', e.target.value)}
						>
							{conActual(OPCIONES_APLICA, valor.AplicaPrecioMed).map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>
					<div />
					<div className={c.campo}>
						<label htmlFor='conv-medtotal'>Medicamentos total</label>
						<input id='conv-medtotal' className={c.input} inputMode='decimal' disabled={disabled} {...importe('MedicamTotal')} />
					</div>
					<div className={c.campo}>
						<label htmlFor='conv-medsobre'>
							Medicamentos sobre
							<InfoHint label='medicamentos sobre' text={A_CONFIRMAR} />
						</label>
						<select
							id='conv-medsobre'
							className={c.select}
							value={valor.MedicamSobre || ''}
							disabled={disabled}
							onChange={(e) => set('MedicamSobre', e.target.value)}
						>
							{conActual(OPCIONES_SOBRE, valor.MedicamSobre).map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>
					<div />
					<div className={c.campo}>
						<label htmlFor='conv-desctotal'>Descartables total</label>
						<input id='conv-desctotal' className={c.input} inputMode='decimal' disabled={disabled} {...importe('DescartTotal')} />
					</div>
					<div className={c.campo}>
						<label htmlFor='conv-descsobre'>
							Descartables sobre
							<InfoHint label='descartables sobre' text={A_CONFIRMAR} />
						</label>
						<input
							id='conv-descsobre'
							className={c.input}
							maxLength={3}
							value={valor.DescartSobre || ''}
							disabled={disabled}
							onChange={(e) => set('DescartSobre', e.target.value.toUpperCase())}
						/>
					</div>
				</div>
			</section>
		</div>
	);
}
