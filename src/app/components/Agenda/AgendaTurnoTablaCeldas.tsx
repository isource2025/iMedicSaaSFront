import styles from './AgendaTurnoTablaCeldas.module.css';

export const TRIAGE_META: Record<
	number,
	{ color: string; label: string; text: string }
> = {
	1: { color: '#ef4444', label: '1', text: '#fff' },
	2: { color: '#f97316', label: '2', text: '#fff' },
	3: { color: '#facc15', label: '3', text: '#1e293b' },
	4: { color: '#22c55e', label: '4', text: '#fff' },
	5: { color: '#1e293b', label: '5', text: '#fff' },
};

export type FilaTurnoAgenda = {
	hora?: string | null;
	estado: string;
	esSobreturno?: boolean;
	idPaciente?: number | null;
	pacienteNombre?: string | null;
	numeroDocumento?: number | null;
	observaciones?: string | null;
	sector: string;
	idClasificacionTriage?: number | null;
	horaAtencion?: string | null;
	horaLlegada?: string | null;
	edad?: number | null;
	cobertura?: string | null;
	sexo?: string | null;
	fechaNacimiento?: string | null;
	racControles?: number;
	racMedicacion?: number;
};

function fmtSexo(s: string | null | undefined): string {
	if (!s) return '—';
	const v = s.trim().toUpperCase();
	if (v === 'M') return 'Masculino';
	if (v === 'F') return 'Femenino';
	return s.trim();
}

function fmtFechaNac(iso: string | null | undefined): string {
	if (!iso) return '—';
	const [y, m, d] = iso.slice(0, 10).split('-');
	if (!y || !m || !d) return iso;
	return `${d}/${m}/${y}`;
}

export function CeldaTriage({ nivel }: { nivel: number | null | undefined }) {
	if (nivel == null || nivel < 1 || nivel > 5) {
		return <span className={styles.triageEmpty}>—</span>;
	}
	const meta = TRIAGE_META[nivel];
	return (
		<span
			className={styles.triageBadge}
			style={{ background: meta.color, color: meta.text }}
			title={`Triage nivel ${nivel}`}
		>
			{meta.label}
		</span>
	);
}

export function CeldaHoras({
	horaTurno,
	horaAtencion,
	conPaciente,
}: {
	horaTurno: string | null | undefined;
	horaAtencion?: string | null;
	conPaciente?: boolean;
}) {
	let atencionLabel = '—';
	if (conPaciente) {
		atencionLabel = horaAtencion ? horaAtencion : 'No atendido';
	}

	return (
		<div className={styles.horasCol}>
			<div className={styles.horasLine}>
				<span className={styles.horasLbl}>Turno</span>
				<span>{horaTurno || '—'}</span>
			</div>
			<div className={styles.horasLine}>
				<span className={styles.horasLbl}>Atención</span>
				<span
					className={
						conPaciente && !horaAtencion ? styles.noAtendido : undefined
					}
				>
					{atencionLabel}
				</span>
			</div>
		</div>
	);
}

export function CeldaPaciente({
	libre,
	cancelado,
	idPaciente,
	pacienteNombre,
	numeroDocumento,
}: {
	libre?: boolean;
	cancelado?: boolean;
	idPaciente?: number | null;
	pacienteNombre?: string | null;
	numeroDocumento?: number | null;
}) {
	if (libre && !cancelado) {
		return <span className={styles.muted}>—</span>;
	}
	return (
		<div className={styles.pacienteCol}>
			<span className={styles.pacienteNombre}>
				{pacienteNombre || (idPaciente ? `Paciente #${idPaciente}` : '—')}
			</span>
			{numeroDocumento ? (
				<span className={styles.pacienteDni}>DNI {numeroDocumento}</span>
			) : null}
		</div>
	);
}

export function CeldaSexoNac({
	sexo,
	fechaNacimiento,
	edad,
}: {
	sexo?: string | null;
	fechaNacimiento?: string | null;
	edad?: number | null;
}) {
	return (
		<div className={styles.sexoCol}>
			<span>{fmtSexo(sexo)}</span>
			<span className={styles.sexoSub}>
				{fmtFechaNac(fechaNacimiento)}
				{edad != null ? ` · ${edad} años` : ''}
			</span>
		</div>
	);
}

export function CeldaRacPills({
	nivel,
	controles,
	medicacion,
}: {
	nivel?: number | null;
	controles?: number;
	medicacion?: number;
}) {
	const c = controles ?? 0;
	const m = medicacion ?? 0;
	const tieneTriage = nivel != null && nivel >= 1 && nivel <= 5;
	if (!tieneTriage && c === 0 && m === 0) {
		return <span className={styles.muted}>—</span>;
	}
	return (
		<div className={styles.racPills}>
			{tieneTriage && nivel != null && TRIAGE_META[nivel] ? (
				<span
					className={styles.racPill}
					style={{
						background: TRIAGE_META[nivel].color,
						color: TRIAGE_META[nivel].text,
					}}
				>
					T{nivel}
				</span>
			) : null}
			{c > 0 ? (
				<span className={`${styles.racPill} ${styles.racPillControl}`}>
					Control{c > 1 ? ` ×${c}` : ''}
				</span>
			) : null}
			{m > 0 ? (
				<span className={`${styles.racPill} ${styles.racPillMed}`}>
					Med{m > 1 ? ` ×${m}` : ''}
				</span>
			) : null}
		</div>
	);
}

export function filaTienePaciente(row: FilaTurnoAgenda, libre: boolean, cancelado: boolean) {
	return !libre || cancelado;
}
