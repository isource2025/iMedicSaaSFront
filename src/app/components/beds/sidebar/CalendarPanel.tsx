'use client';
import styles from './CalendarPanel.module.css';
import { useMemo, useRef, useState } from 'react';
import { useCalendar } from '../hooks/useCalendar';
import { useBedDetail } from '../contexts/BedDetailContext';
import { CSSTransition, SwitchTransition } from 'react-transition-group';

type Props = {
	selected?: Date | null;
	onSelect?: (d: Date) => void;
	/** Fecha ingreso DD/MM/YYYY */
	fechaIngreso?: string | null;
};

function parseAdmissionDate(fechaIngreso?: string | null): Date | null {
	if (!fechaIngreso) return null;
	const m = String(fechaIngreso).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (m) {
		const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
		d.setHours(0, 0, 0, 0);
		return d;
	}
	const iso = new Date(fechaIngreso);
	if (Number.isNaN(iso.getTime())) return null;
	iso.setHours(0, 0, 0, 0);
	return iso;
}

function startOfDay(d: Date) {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
}

export default function CalendarPanel({ selected, onSelect, fechaIngreso }: Props) {
	const { selectedDate, setSelectedDate } = useBedDetail();
	const { cursor, monthStart, monthEnd, prev, next } = useCalendar(
		selectedDate ?? new Date(),
	);

	const admission = useMemo(() => parseAdmissionDate(fechaIngreso), [fechaIngreso]);
	const today = useMemo(() => startOfDay(new Date()), []);

	const [dir, setDir] = useState<1 | -1>(1);
	const titleRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);
	const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;

	const cells = useMemo(() => {
		const startWeekDay = (monthStart.getDay() + 6) % 7;
		const currentMonthDays = monthEnd.getDate();

		const prevMonthLastDate = new Date(
			monthStart.getFullYear(),
			monthStart.getMonth(),
			0,
		).getDate();

		const result: Date[] = [];

		for (let i = startWeekDay - 1; i >= 0; i--) {
			const day = prevMonthLastDate - i;
			result.push(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, day));
		}

		for (let d = 1; d <= currentMonthDays; d++) {
			result.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), d));
		}

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

	const internacionInfo = (d: Date) => {
		if (!admission) return null;
		const day = startOfDay(d);
		if (day < admission || day > today) return null;
		const dayNumber =
			Math.floor((day.getTime() - admission.getTime()) / (24 * 60 * 60 * 1000)) + 1;
		return { dayNumber, isFirst: isSame(day, admission) };
	};

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

			<div className={styles.grid}>
				{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
					<div key={i} className={styles.dow}>
						{d}
					</div>
				))}
			</div>

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
							<div className={styles.grid}>
								{cells.map((d, i) => {
									const outside = isOutsideMonth(d);
									const active = isSame(d, selectedDate);
									const stay = internacionInfo(d);
									return (
										<button
											key={i}
											className={`${styles.cell} ${
												outside ? styles.muted : ''
											} ${active ? styles.active : ''} ${
												stay ? styles.internacion : ''
											} ${stay?.isFirst ? styles.internacionFirst : ''}`}
											onClick={() => handleSelect(d)}
											aria-pressed={active}
											title={
												stay
													? `Día ${stay.dayNumber} de internación`
													: undefined
											}
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
