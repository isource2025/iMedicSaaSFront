'use client';
import styles from './CalendarPanel.module.css';
import { useMemo, useRef, useState } from 'react';
import { useCalendar } from '../hooks/useCalendar';
import { useBedDetail } from '../contexts/BedDetailContext';
import { CSSTransition, SwitchTransition } from 'react-transition-group';

type Props = {
	selected?: Date | null;
	onSelect?: (d: Date) => void;
};

export default function CalendarPanel({ selected, onSelect }: Props) {
	const { selectedDate, setSelectedDate } = useBedDetail();
	const { cursor, monthStart, monthEnd, prev, next } = useCalendar(
		selectedDate ?? new Date(),
	);

	// Dirección por si luego quisieras volver a slide; ahora la usamos igual para llaves
	const [dir, setDir] = useState<1 | -1>(1);
	const titleRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);
	const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;

	// Genera SIEMPRE 6 filas (42 celdas). Incluye días del mes anterior y siguiente.
	const cells = useMemo(() => {
		const startWeekDay = (monthStart.getDay() + 6) % 7; // lunes=0
		const currentMonthDays = monthEnd.getDate();

		const prevMonthLastDate = new Date(
			monthStart.getFullYear(),
			monthStart.getMonth(),
			0,
		).getDate(); // último día del mes anterior

		const result: Date[] = [];

		// Días del mes anterior para rellenar el inicio
		for (let i = startWeekDay - 1; i >= 0; i--) {
			const day = prevMonthLastDate - i;
			result.push(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, day));
		}

		// Días del mes actual
		for (let d = 1; d <= currentMonthDays; d++) {
			result.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), d));
		}

		// Días del mes siguiente para completar hasta 42
		while (result.length < 42) {
			const nextIndex = result.length - (startWeekDay + currentMonthDays) + 1;
			result.push(
				new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, nextIndex),
			);
		}

		return result;
	}, [monthStart, monthEnd]);

	const isSame = (a?: Date | null, b?: Date | null) =>
		!!a &&
		!!b &&
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate();

	const isOutsideMonth = (d: Date) => d.getMonth() !== monthStart.getMonth();

	const handlePrev = () => {
		setDir(-1);
		prev();
	};

	const handleNext = () => {
		setDir(1);
		next();
	};

	const handleSelect = (d: Date) => {
		if (onSelect) onSelect(d);
		else setSelectedDate(d);
	};

	return (
		<div className={styles.card}>
			<div className={styles.head}>
				<button onClick={handlePrev} aria-label='Mes anterior'>
					◀
				</button>

				{/* Título con transición por opacidad */}
				<SwitchTransition mode='out-in'>
					<CSSTransition
						key={monthKey}
						nodeRef={titleRef}
						timeout={260}
						classNames={{
							enter: styles.fadeEnter,
							enterActive: styles.fadeEnterActive,
							exit: styles.fadeExit,
							exitActive: styles.fadeExitActive,
						}}
					>
						<div ref={titleRef} className={styles.title}>
							{cursor
								.toLocaleString('es-AR', { month: 'long', year: 'numeric' })
								.toUpperCase()}
						</div>
					</CSSTransition>
				</SwitchTransition>

				<button onClick={handleNext} aria-label='Mes siguiente'>
					▶
				</button>
			</div>

			{/* Encabezados DOW fijos */}
			<div className={styles.grid}>
				{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
					<div key={i} className={styles.dow}>
						{d}
					</div>
				))}
			</div>

			{/* Vista del mes (42 celdas) con transición por opacidad */}
			<div className={styles.viewport}>
				<SwitchTransition mode='out-in'>
					<CSSTransition
						key={monthKey}
						nodeRef={gridRef}
						timeout={260}
						classNames={{
							enter: styles.fadeEnter,
							enterActive: styles.fadeEnterActive,
							exit: styles.fadeExit,
							exitActive: styles.fadeExitActive,
						}}
					>
						<div ref={gridRef}>
							<div className={styles.grid /* misma rejilla, 7 cols */}>
								{cells.map((d, i) => {
									const outside = isOutsideMonth(d);
									const active = isSame(d, selectedDate);
									return (
										<button
											key={i}
											className={`${styles.cell} ${
												outside ? styles.muted : ''
											} ${active ? styles.active : ''}`}
											onClick={() => handleSelect(d)}
											aria-pressed={active}
										>
											{d.getDate()}
										</button>
									);
								})}
							</div>
						</div>
					</CSSTransition>
				</SwitchTransition>
			</div>
		</div>
	);
}
