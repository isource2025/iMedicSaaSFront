'use client';

import type { AdmissionSearchRow } from '@/app/services/admissionSearchService';
import type { VisitDetailTabId } from './AdmissionVisitDetailModal';
import styles from './AdmissionSearchClinicalBadges.module.css';

export type ClinicalBadgeKind = 'HCI' | 'Prác' | 'Ind' | 'Med' | 'Evo' | 'Est' | 'Prot' | 'Adj';

export const CLINICAL_BADGE_TAB: Record<ClinicalBadgeKind, VisitDetailTabId> = {
	HCI: 'hcIngreso',
	Prác: 'practicas',
	Ind: 'indicaciones',
	Med: 'medicamentos',
	Evo: 'evoluciones',
	Est: 'estudios',
	Prot: 'protocolos',
	Adj: 'adjuntos',
};

export function visitClinicalCount(row: AdmissionSearchRow, ...keys: string[]): number {
	const o = row as unknown as Record<string, unknown>;
	for (const k of keys) {
		const v = o[k];
		if (typeof v === 'number' && !Number.isNaN(v)) return v;
		if (typeof v === 'string' && v.trim() !== '') {
			const p = parseInt(v, 10);
			if (!Number.isNaN(p)) return p;
		}
	}
	return 0;
}

const BADGE_ITEMS: {
	label: ClinicalBadgeKind;
	keys: string[];
	title: string;
}[] = [
	{ label: 'HCI', keys: ['CntHistoriaClinica', 'cntHistoriaClinica'], title: 'Historia clínica de ingreso' },
	{ label: 'Prác', keys: ['CntPracticas', 'cntPracticas'], title: 'Prácticas' },
	{ label: 'Ind', keys: ['CntIndicaciones', 'cntIndicaciones'], title: 'Indicaciones' },
	{ label: 'Med', keys: ['CntMedicacion', 'cntMedicacion'], title: 'Medicación suministrada' },
	{ label: 'Evo', keys: ['CntEvoluciones', 'cntEvoluciones'], title: 'Evoluciones' },
	{ label: 'Est', keys: ['CntEstudios', 'cntEstudios', 'CntLaboratorios', 'cntLaboratorios'], title: 'Estudios solicitados' },
	{ label: 'Prot', keys: ['CntProtocolos', 'cntProtocolos'], title: 'Protocolos' },
	{ label: 'Adj', keys: ['CntAdjuntos', 'cntAdjuntos'], title: 'Adjuntos' },
];

type Props = {
	row: AdmissionSearchRow;
	onBadgeClick?: (kind: ClinicalBadgeKind, numeroVisita: number) => void;
	/** Badge actualmente expandido en el panel inline. */
	activeKind?: ClinicalBadgeKind;
};

export function VisitClinicalBadges({ row, onBadgeClick, activeKind }: Props) {
	return (
		<div className={styles.visitBadges} role="group" aria-label="Registros clínicos por tipo">
			{BADGE_ITEMS.map(({ label, keys, title }) => {
				const count = visitClinicalCount(row, ...keys);
				const isActive = activeKind === label;
				const className = `${styles.visitBadge} ${count === 0 ? styles.visitBadgeZero : ''} ${
					count > 0 && onBadgeClick ? styles.visitBadgeClickable : ''
				} ${isActive ? styles.visitBadgeActive : ''}`;
				const content = (
					<>
						{label} · {count}
					</>
				);

				if (count > 0 && onBadgeClick) {
					return (
						<button
							key={label}
							type="button"
							className={className}
							title={`${title}: ${count} — ver detalle`}
							onClick={(e) => {
								e.stopPropagation();
								onBadgeClick(label, row.NumeroVisita);
							}}
						>
							{content}
						</button>
					);
				}

				return (
					<span key={label} className={className} title={`${title}: ${count}`}>
						{content}
					</span>
				);
			})}
		</div>
	);
}

export function clinicalBadgeToTab(kind: ClinicalBadgeKind): VisitDetailTabId {
	return CLINICAL_BADGE_TAB[kind];
}
