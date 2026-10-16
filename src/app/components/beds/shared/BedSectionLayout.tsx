'use client';

import { ReactNode } from 'react';
import styles from '../indicaciones/IndicacionesSection.module.css';
import { useBedDetail } from '../contexts/BedDetailContext';
import BedSectionHeader from './BedSectionHeader';
import PeriodFilter, { Periodo } from './PeriodFilter';

type SearchProps = {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
};

type Props = {
	title: string;
	date?: Date | string | null;
	addLabel?: string;
	onAdd?: () => void;
	addDisabled?: boolean;
	addTitle?: string;
	exportSlot?: ReactNode;
	search?: SearchProps;
	period?: { value: Periodo; onChange: (value: Periodo) => void };
	extraToolbar?: ReactNode;
	children: ReactNode;
};

export default function BedSectionLayout({
	title,
	date,
	addLabel,
	onAdd,
	addDisabled,
	addTitle,
	exportSlot,
	search,
	period,
	extraToolbar,
	children,
}: Props) {
	const { selectedDate } = useBedDetail();

	return (
		<div className={styles.root}>
			<BedSectionHeader title={title} date={date ?? selectedDate}>
				{(onAdd && addLabel) || exportSlot ? (
					<>
						{onAdd && addLabel ? (
							<button
								type="button"
								className={`${styles.btn} ${styles.btnPrimary} ${styles.btnAddDate}`}
								onClick={onAdd}
								disabled={addDisabled}
								title={addTitle}
							>
								{addLabel}
							</button>
						) : null}
						{exportSlot}
					</>
				) : null}
			</BedSectionHeader>

			{(search || period || extraToolbar) && (
				<div className={styles.toolbar}>
					{search ? (
						<div className={styles.searchWrap}>
							<span className={styles.searchIcon} aria-hidden>
								🔎
							</span>
							<input
								className={styles.searchInput}
								type="text"
								placeholder={search.placeholder || 'Buscar…'}
								value={search.value}
								onChange={(e) => search.onChange(e.target.value)}
							/>
						</div>
					) : (
						<div />
					)}
					{period ? <PeriodFilter value={period.value} onChange={period.onChange} /> : null}
					{extraToolbar}
				</div>
			)}

			<div className={styles.content}>{children}</div>
		</div>
	);
}
