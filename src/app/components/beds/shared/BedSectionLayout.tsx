'use client';

import { ReactNode } from 'react';
import styles from '../indicaciones/IndicacionesSection.module.css';

type SearchProps = {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
};

type Props = {
	title: string;
	subtitle?: string;
	dateBadge?: string | number;
	addLabel?: string;
	onAdd?: () => void;
	addDisabled?: boolean;
	addTitle?: string;
	exportSlot?: ReactNode;
	search?: SearchProps;
	extraToolbar?: ReactNode;
	children: ReactNode;
};

export default function BedSectionLayout({
	title,
	subtitle,
	dateBadge,
	addLabel,
	onAdd,
	addDisabled,
	addTitle,
	exportSlot,
	search,
	extraToolbar,
	children,
}: Props) {
	return (
		<div className={styles.root}>
			<div className={styles.dateHeader}>
				<h2 className={styles.sectionTitle}>{title}</h2>
				{dateBadge != null && dateBadge !== '' ? (
					<span className={styles.dateNumber}>{dateBadge}</span>
				) : null}
				{subtitle ? <span className={styles.dateText}>{subtitle}</span> : null}
				<div className={styles.dateActions}>
					{onAdd && addLabel ? (
						<button
							type="button"
							className={`${styles.btn} ${styles.btnPrimary} ${styles.btnAddDate}`}
							onClick={onAdd}
							disabled={addDisabled}
							title={addTitle}
						>
							<span className={styles.addIcon} aria-hidden>
								+
							</span>
							{addLabel}
						</button>
					) : null}
					{exportSlot}
				</div>
			</div>

			{(search || extraToolbar) && (
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
					{extraToolbar}
				</div>
			)}

			<div className={styles.content}>{children}</div>
		</div>
	);
}
