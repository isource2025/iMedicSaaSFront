'use client';

import { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import SignaturePad from 'signature_pad';
import styles from './PersonalFirmaPad.module.css';

export type PersonalFirmaPadRef = {
	clearPad: () => void;
	toPngFile: () => Promise<File | null>;
	isPadEmpty: () => boolean;
};

type Props = {
	active: boolean;
	initialDataUrl?: string | null;
};

const BASE_H = 200;

function fitCanvas(canvas: HTMLCanvasElement) {
	const wrap = canvas.parentElement;
	const cssW = Math.max(280, wrap ? wrap.clientWidth : 400);
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	canvas.width = Math.floor(cssW * dpr);
	canvas.height = Math.floor(BASE_H * dpr);
	canvas.style.width = `${cssW}px`;
	canvas.style.height = `${BASE_H}px`;
	const ctx = canvas.getContext('2d');
	if (ctx) {
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.scale(dpr, dpr);
	}
}

const PersonalFirmaPad = forwardRef<PersonalFirmaPadRef, Props>(function PersonalFirmaPad(
	{ active, initialDataUrl },
	ref,
) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const padRef = useRef<SignaturePad | null>(null);
	/** Firma cargada desde BD (fromDataURL) puede seguir marcada “vacía” para el pad; igual debe poder exportarse */
	const importedRef = useRef(false);
	const [strokeMin, setStrokeMin] = useState(0.6);
	const [strokeMax, setStrokeMax] = useState(2.6);
	const [penColor, setPenColor] = useState('#0f172a');

	const destroyPad = useCallback(() => {
		if (padRef.current) {
			padRef.current.off();
			padRef.current = null;
		}
	}, []);

	useEffect(() => {
		if (!active) {
			destroyPad();
			return;
		}
		const canvas = canvasRef.current;
		if (!canvas) return;
		const id = requestAnimationFrame(() => {
			fitCanvas(canvas);
			destroyPad();
			importedRef.current = false;
			padRef.current = new SignaturePad(canvas, {
				backgroundColor: 'rgb(255,255,255)',
				penColor: '#0f172a',
				minWidth: 0.6,
				maxWidth: 2.6,
				throttle: 16,
			});
			const u = initialDataUrl?.trim();
			if (u) {
				padRef.current
					.fromDataURL(u, { ratio: 1 })
					.then(() => {
						importedRef.current = true;
					})
					.catch(() => {});
			}
		});
		return () => {
			cancelAnimationFrame(id);
			destroyPad();
		};
	}, [active, initialDataUrl, destroyPad]);

	useEffect(() => {
		const pad = padRef.current;
		if (!pad || !active) return;
		pad.minWidth = strokeMin;
		pad.maxWidth = strokeMax;
		pad.penColor = penColor;
	}, [active, strokeMin, strokeMax, penColor]);

	useImperativeHandle(
		ref,
		() => ({
			clearPad: () => {
				padRef.current?.clear();
				importedRef.current = false;
			},
			isPadEmpty: () => padRef.current?.isEmpty() ?? true,
			toPngFile: () =>
				new Promise((resolve) => {
					const canvas = canvasRef.current;
					const pad = padRef.current;
					if (!canvas || !pad || (pad.isEmpty() && !importedRef.current)) {
						resolve(null);
						return;
					}
					canvas.toBlob(
						(blob) => {
							if (!blob) {
								resolve(null);
								return;
							}
							resolve(new File([blob], 'firma.png', { type: 'image/png' }));
						},
						'image/png',
						0.92,
					);
				}),
		}),
		[],
	);

	const onThickness = (v: number) => {
		const min = Math.round(v * 10) / 10;
		const max = Math.min(min + 2.2, 5);
		setStrokeMin(min);
		setStrokeMax(max);
	};

	const limpiar = () => padRef.current?.clear();

	if (!active) return null;

	return (
		<div className={styles.wrap}>
			<div className={styles.toolbar}>
				<label>
					Grosor
					<input
						type='range'
						className={styles.range}
						min={0.3}
						max={2.2}
						step={0.1}
						value={strokeMin}
						onChange={(e) => onThickness(Number(e.target.value))}
					/>
				</label>
				<label>
					Color
					<input
						type='color'
						className={styles.color}
						value={penColor}
						onChange={(e) => setPenColor(e.target.value)}
						aria-label='Color del trazo'
					/>
				</label>
				<button type='button' className={styles.clearBtn} onClick={limpiar}>
					Limpiar lienzo
				</button>
			</div>
			<div className={styles.canvasWrap}>
				<canvas ref={canvasRef} className={styles.canvas} aria-label='Lienzo de firma' />
			</div>
			<p className={styles.hint}>
				Dibuje con el mouse o el dedo. Si ya había firma, aparece abajo para retocarla o reemplazarla
				al guardar.
			</p>
		</div>
	);
});

export default PersonalFirmaPad;
