'use client';
import { useEffect, useState } from 'react';
import s from './PatientMiniHeader.module.css';

type Props = {
	nombre: string; // ej: "MORALES FERNANDO RAMON"
	nroVisita?: string | number; // ej: 359483
	ubicacion?: string;
};

export default function PatientMiniHeader({ nombre, nroVisita, ubicacion }: Props) {
	const [hora, setHora] = useState<string>('');

	useEffect(() => {
		const tick = () =>
			setHora(
				new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
			);
		tick();
		const id = setInterval(tick, 30_000);
		return () => clearInterval(id);
	}, []);

	return (
		<div className={s.wrap}>
			<div className={s.top}>
				<div className={s.time}>{hora}</div>
			</div>

			<div className={s.info}>
				<div className={s.name}>{nombre}</div>

				<div className={s.row}>
					{nroVisita !== undefined && (
						<span className={s.kv}>
							<label>Nro Visita:</label>
							<b>{nroVisita}</b>
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
