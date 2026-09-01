'use client';

import { IoFemale, IoMale } from 'react-icons/io5';
import type { DatosPacientePedido } from '@/app/types/estudios';
import formStyles from './PedidoEstudioForms.module.css';

type Props = {
	paciente: DatosPacientePedido;
	idVisita?: number | null;
};

function txt(value?: string | number | null) {
	const s = value == null ? '' : String(value).trim();
	return s === '' ? null : s;
}

function formatDoc(doc?: string | null) {
	const digits = String(doc || '').replace(/\D/g, '');
	if (!digits) return '';
	return Number(digits).toLocaleString('es-AR');
}

function SexoIcon({ sexo, desc }: { sexo?: string | null; desc?: string | null }) {
	const s = `${sexo || ''} ${desc || ''}`.trim().toUpperCase();
	if (s === 'F' || s.includes('FEM')) {
		return <IoFemale className={formStyles.sexoF} title="Femenino" />;
	}
	if (s === 'M' || s.includes('MASC') || s.startsWith('M')) {
		return <IoMale className={formStyles.sexoM} title="Masculino" />;
	}
	return null;
}

export default function PacientePedidoHeader({ paciente, idVisita }: Props) {
	const docFmt = formatDoc(paciente.PacienteDocumento);
	const chipsUbicacion = String(paciente.Ubicacion || '')
		.split('·')
		.map((p) => p.trim())
		.filter(Boolean);

	const domicilio = [txt(paciente.PacienteDomicilio), txt(paciente.PacienteLocalidad)]
		.filter(Boolean)
		.join(', ');

	const datos = [
		paciente.PacienteEdad != null ? { label: 'Edad', value: `${paciente.PacienteEdad} años` } : null,
		{ label: 'HC', value: txt(paciente.PacienteNumeroHC) },
		{ label: 'Afiliado', value: txt(paciente.PacienteAfiliado) },
		{ label: 'Domicilio', value: domicilio || null },
		{ label: 'Tel.', value: txt(paciente.PacienteTelefono) || txt(paciente.PacienteTelefonoAlternativo) },
	].filter((d): d is { label: string; value: string } => !!d && !!d.value);

	return (
		<div className={formStyles.pacienteCard}>
			<div className={formStyles.pacienteLeft}>
				<div className={formStyles.pacienteDocRow}>
					<SexoIcon sexo={paciente.PacienteSexo} desc={paciente.PacienteSexoDescripcion} />
					{docFmt ? <span className={formStyles.pacienteDoc}>Doc. {docFmt}</span> : null}
				</div>
				<p className={formStyles.pacienteNombre}>
					{paciente.PacienteNombre || 'Paciente sin datos'}
				</p>
				<div className={formStyles.pacienteChips}>
					{paciente.TipoAtencion === 'INTERNADO' ? (
						<span className={`${formStyles.chip} ${formStyles.chipInternado}`}>Internado</span>
					) : paciente.TipoAtencion === 'AMBULATORIO' ? (
						<span className={`${formStyles.chip} ${formStyles.chipAmbu}`}>Ambulatorio</span>
					) : null}
					{chipsUbicacion.map((chip) => (
						<span key={chip} className={formStyles.chip}>
							{chip}
						</span>
					))}
				</div>
				{datos.length > 0 ? (
					<dl className={formStyles.pacienteDatos}>
						{datos.map((d) => (
							<div key={d.label} className={formStyles.pacienteDato}>
								<dt>{d.label}</dt>
								<dd>{d.value}</dd>
							</div>
						))}
					</dl>
				) : null}
			</div>
			<div className={formStyles.pacienteRight}>
				{idVisita != null ? (
					<>
						<span className={formStyles.visitaNum}>{idVisita}</span>
						<span className={formStyles.visitaLbl}>N° de visita</span>
					</>
				) : null}
				{paciente.ObraSocial ? (
					<>
						<span className={formStyles.coberturaVal}>{paciente.ObraSocial}</span>
						<span className={formStyles.coberturaLbl}>Cobertura</span>
					</>
				) : null}
			</div>
		</div>
	);
}
