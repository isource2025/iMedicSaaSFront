'use client';
import styles from './CalendarPanel.module.css';
import { useMemo } from 'react';
import { useCalendar } from '../hooks/useCalendar';

type Props = {
	selected?: Date | null;
	onSelect?: (d: Date) => void;
};
export default function CalendarPanel({ selected, onSelect }: Props) {
	const { cursor, monthStart, monthEnd, prev, next } = useCalendar(selected ?? new Date());

	const cells = useMemo(() => {
		const startWeekDay = (monthStart.getDay() + 6) % 7; // lunes=0
		const days = monthEnd.getDate();
		const arr: (Date | null)[] = [];
		for (let i = 0; i < startWeekDay; i++) arr.push(null);
		for (let d = 1; d <= days; d++)
			arr.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), d));
		return arr;
	}, [monthStart, monthEnd]);

	const isSame = (a?: Date | null, b?: Date | null) =>
		!!a &&
		!!b &&
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate();

	return (
		<div className={styles.card}>
			<div className={styles.head}>
				<button onClick={prev} aria-label='Mes anterior'>
					◀
				</button>
				<div className={styles.title}>
					{cursor
						.toLocaleString('es-AR', { month: 'long', year: 'numeric' })
						.toUpperCase()}
				</div>
				<button onClick={next} aria-label='Mes siguiente'>
					▶
				</button>
			</div>
			<div className={styles.grid}>
				{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
					<div key={i} className={styles.dow}>
						{d}
					</div>
				))}
				{cells.map((d, i) => (
					<button
						key={i}
						disabled={!d}
						className={`${styles.cell} ${
							isSame(d, selected) ? styles.active : ''
						}`}
						onClick={() => d && onSelect?.(d)}
					>
						{d ? d.getDate() : ''}
					</button>
				))}
			</div>
		</div>
	);
}
