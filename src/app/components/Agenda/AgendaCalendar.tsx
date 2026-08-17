'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import { useCalendar } from '../beds/hooks/useCalendar';
import { agendaService } from '@/app/services/agendaService';
import styles from '../beds/sidebar/CalendarPanel.module.css';
import calExtra from './AgendaCalendar.module.css';
import { inicioDelDia, hoyLocal } from '@/app/utils/agendaFecha';

function toIso(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${dd}`;
}

type Props = {
	selected: Date;
	onSelect: (d: Date) => void;
	/** Si está definida, resalta los días del mes visible con agenda (cupos). */
	matricula?: number | null;
	/** Incrementar para volver a cargar los días resaltados. */
	refreshToken?: number;
};

export default function AgendaCalendar({
	selected,
	onSelect,
	matricula,
	refreshToken = 0,
}: Props) {
	const { cursor, monthStart, monthEnd, prev, next } = useCalendar(selected);
	const [, setDir] = useState<1 | -1>(1);
	const titleRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);
	const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;
	const [diasConAgenda, setDiasConAgenda] = useState<Set<string>>(() => new Set());
	const [feriadosMes, setFeriadosMes] = useState<Map<string, string>>(() => new Map());

	useEffect(() => {
		let cancel = false;
		const desde = toIso(monthStart);
		const hasta = toIso(monthEnd);

		agendaService
			.getFeriados(desde, hasta)
			.then((lista) => {
				if (cancel) return;
				const map = new Map<string, string>();
				for (const f of lista || []) {
					const iso = String(f?.fecha || '').slice(0, 10);
					if (iso.length === 10) {
						map.set(iso, String(f?.nombre || 'Feriado').trim() || 'Feriado');
					}
				}
				setFeriadosMes(map);
			})
			.catch(() => {
				if (!cancel) setFeriadosMes(new Map());
			});

		if (!matricula) {
			setDiasConAgenda(new Set());
			return () => {
				cancel = true;
			};
		}

		const aplicarFechas = (lista: string[]) => {
			const fechas = new Set<string>();
			for (const f of lista) {
				const iso = String(f).slice(0, 10);
				if (iso.length === 10) fechas.add(iso);
			}
			setDiasConAgenda(fechas);
		};

		agendaService
			.getDiasConAgenda(matricula, desde, hasta)
			.then((r) => {
				if (cancel) return;
				aplicarFechas(r.fechas || []);
			})
			.catch(async (err) => {
				if (cancel) return;
				if (err?.response?.status === 404) {
					try {
						const r = await agendaService.getSlots(matricula, desde, hasta, { ligero: true });
						if (!cancel) {
							aplicarFechas(
								(r.dias || [])
									.filter((d) => !d.bloqueado && d.slots?.length > 0)
									.map((d) => d.fecha),
							);
						}
						return;
					} catch {
						/* sigue abajo */
					}
				}
				setDiasConAgenda(new Set());
				console.warn('[AgendaCalendar] No se pudieron cargar días con agenda', err);
			});
		return () => {
			cancel = true;
		};
	}, [matricula, monthKey, monthStart, monthEnd, refreshToken]);

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
			result.push(
				new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, prevMonthLastDate - i),
			);
		}
		for (let d = 1; d <= currentMonthDays; d++) {
			result.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), d));
		}
		while (result.length < 42) {
			const nextIndex = result.length - (startWeekDay + currentMonthDays) + 1;
			result.push(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, nextIndex));
		}
		return result;
	}, [monthStart, monthEnd]);

	const isSame = (a: Date, b: Date) =>
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate();
	const isOutsideMonth = (d: Date) => d.getMonth() !== monthStart.getMonth();
	const isPast = (d: Date) => inicioDelDia(d).getTime() < hoyLocal().getTime();

	return (
		<div className={styles.card}>
			<div className={styles.head}>
				<button
					onClick={() => {
						setDir(-1);
						prev();
					}}
					aria-label='Mes anterior'
				>
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
				<button
					onClick={() => {
						setDir(1);
						next();
					}}
					aria-label='Mes siguiente'
				>
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
									const active = isSame(d, selected);
									const past = isPast(d);
									const iso = toIso(d);
									const feriadoNombre = !outside ? feriadosMes.get(iso) : undefined;
									const esFeriado = Boolean(feriadoNombre);
									const hasTurnos =
										!!matricula &&
										diasConAgenda.has(iso) &&
										!outside &&
										!past &&
										!active &&
										!esFeriado;
									const title = esFeriado
										? `Feriado: ${feriadoNombre}`
										: past
											? 'No se pueden asignar turnos en fechas pasadas'
											: undefined;
									return (
										<button
											key={i}
											type='button'
											disabled={past}
											className={[
												styles.cell,
												outside ? styles.muted : '',
												hasTurnos ? `${calExtra.hasTurnos} ${calExtra.cellHasTurnos}` : '',
												active ? calExtra.selected : '',
												past ? calExtra.past : '',
												esFeriado ? calExtra.feriado : '',
											]
												.filter(Boolean)
												.join(' ')}
											onClick={() => !past && onSelect(d)}
											aria-pressed={active}
											aria-disabled={past}
											aria-label={
												esFeriado
													? `${d.getDate()}, feriado: ${feriadoNombre}`
													: undefined
											}
											title={title}
										>
											<span className={calExtra.dayNum}>{d.getDate()}</span>
											{esFeriado ? (
												<span className={calExtra.feriadoMark} aria-hidden>
													F
												</span>
											) : null}
										</button>
									);
								})}
							</div>
						</div>
					</CSSTransition>
				</SwitchTransition>
			</div>
			<p className={calExtra.leyenda}>
				<span className={calExtra.leyendaFeriado}>F</span> Feriado nacional — al hacer clic
				se ve el motivo
			</p>
		</div>
	);
}
