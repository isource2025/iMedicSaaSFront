'use client';

import CalendarPanel from '../sidebar/CalendarPanel';
import { useBedDetail } from '../contexts/BedDetailContext';
import BedSheet from './BedSheet';
import styles from './DayPickerSheet.module.css';

type Props = {
	onClose: () => void;
};

export default function DayPickerSheet({ onClose }: Props) {
	const { bed, setSelectedDate } = useBedDetail();

	const elegir = (d: Date) => {
		setSelectedDate(d);
		onClose();
	};

	const irAHoy = () => {
		const hoy = new Date();
		hoy.setHours(0, 0, 0, 0);
		elegir(hoy);
	};

	return (
		<BedSheet
			title='Elegí un día'
			onClose={onClose}
			headerExtra={
				<button type='button' className={styles.hoy} onClick={irAHoy}>
					Hoy
				</button>
			}
		>
			<div className={styles.calendar}>
				<CalendarPanel
					onSelect={elegir}
					fechaIngreso={bed?.fechaIngresoSQL}
					fechaEgreso={bed?.fechaEgresoSQL}
					egresada={Boolean(bed?.egresada)}
				/>
			</div>
		</BedSheet>
	);
}
