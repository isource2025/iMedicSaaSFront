'use client';

import { IoFemale, IoMale } from 'react-icons/io5';
import formStyles from './PedidoEstudioForms.module.css';

type Props = {
	nombre?: string | null;
	documento?: string | null;
	sexo?: string | null;
	sexoDescripcion?: string | null;
	tipoAtencion?: string | null;
	ubicacion?: string | null;
	idVisita?: number | null;
	obraSocial?: string | null;
};

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

export default function PacientePedidoHeader({
	nombre,
	documento,
	sexo,
	sexoDescripcion,
	tipoAtencion,
	ubicacion,
	idVisita,
	obraSocial,
}: Props) {
	const docFmt = formatDoc(documento);
	const chipsUbicacion = String(ubicacion || '')
		.split('·')
		.map((p) => p.trim())
		.filter(Boolean);

	return (
		<div className={formStyles.pacienteCard}>
			<div className={formStyles.pacienteLeft}>
				<div className={formStyles.pacienteDocRow}>
					<SexoIcon sexo={sexo} desc={sexoDescripcion} />
					{docFmt ? <span className={formStyles.pacienteDoc}>Doc. {docFmt}</span> : null}
				</div>
				<p className={formStyles.pacienteNombre}>{nombre || 'Paciente sin datos'}</p>
				<div className={formStyles.pacienteChips}>
					{tipoAtencion === 'INTERNADO' ? (
						<span className={`${formStyles.chip} ${formStyles.chipInternado}`}>Internado</span>
					) : tipoAtencion === 'AMBULATORIO' ? (
						<span className={`${formStyles.chip} ${formStyles.chipAmbu}`}>Ambulatorio</span>
					) : null}
					{chipsUbicacion.map((chip) => (
						<span key={chip} className={formStyles.chip}>
							{chip}
						</span>
					))}
				</div>
			</div>
			<div className={formStyles.pacienteRight}>
				{idVisita != null ? (
					<>
						<span className={formStyles.visitaNum}>{idVisita}</span>
						<span className={formStyles.visitaLbl}>N° de visita</span>
					</>
				) : null}
				{obraSocial ? (
					<>
						<span className={formStyles.coberturaVal}>{obraSocial}</span>
						<span className={formStyles.coberturaLbl}>Cobertura</span>
					</>
				) : null}
			</div>
		</div>
	);
}
