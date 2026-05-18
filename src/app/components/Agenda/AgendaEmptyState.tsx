'use client';

import styles from './AgendaEmptyState.module.css';

interface Props {
	icon: string;
	title: string;
	description: string;
	compact?: boolean;
}

export default function AgendaEmptyState({ icon, title, description, compact }: Props) {
	return (
		<div className={compact ? styles.wrapCompact : styles.wrap}>
			<div className={styles.emptyState}>
				<div className={styles.emptyIcon} aria-hidden>
					{icon}
				</div>
				<h3 className={styles.emptyTitle}>{title}</h3>
				<p className={styles.emptyDescription}>{description}</p>
			</div>
		</div>
	);
}
