"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./LoginCarousel.module.css";

type Slide = {
	imageUrl: string;
	title: string;
	description: string;
};

/** Ancho visible de cada card respecto del viewport (~72% muestra centro + vistas laterales). */
const SLIDE_WIDTH_RATIO = 0.72;
const SLIDE_GAP_PX = 14;

export default function LoginCarousel() {
	const slides: Slide[] = useMemo(
		() => [
			{
				imageUrl:
					"https://i.pinimg.com/736x/c4/8e/f4/c48ef4a6394486a0b7ca4618a0dafd57.jpg",
				title: "Tecnología al servicio de la salud",
				description:
					"Optimiza procesos clínicos con información en tiempo real.",
			},
			{
				imageUrl:
					"https://i.pinimg.com/736x/03/20/eb/0320eb09d3c88ec1cbf0ef7efcaec393.jpg",
				title: "Gestión integral del paciente",
				description:
					"Historia clínica, internación y análisis en un mismo lugar.",
			},
			{
				imageUrl:
					"https://i.pinimg.com/736x/65/fb/e4/65fbe47563d0b2f30b7aa827870e7bb1.jpg",
				title: "Decisiones basadas en datos",
				description:
					"Indicadores y tableros para mejorar la calidad asistencial.",
			},
		],
		[],
	);

	const [index, setIndex] = useState(0);
	const viewportRef = useRef<HTMLDivElement>(null);
	const [viewportW, setViewportW] = useState(0);

	useLayoutEffect(() => {
		const el = viewportRef.current;
		if (!el) return undefined;
		const sync = () => setViewportW(el.offsetWidth);
		sync();
		const ro = new ResizeObserver(sync);
		ro.observe(el);
		window.addEventListener("resize", sync);
		return () => {
			ro.disconnect();
			window.removeEventListener("resize", sync);
		};
	}, []);

	const slideW = viewportW > 0 ? viewportW * SLIDE_WIDTH_RATIO : 400;
	const translateX =
		viewportW > 0 ? -(index * (slideW + SLIDE_GAP_PX)) + (viewportW - slideW) / 2 : 0;

	const goTo = (i: number) => setIndex(((i % slides.length) + slides.length) % slides.length);
	const goPrev = () => goTo(index - 1);
	const goNext = () => goTo(index + 1);

	return (
		<div className={styles.carouselRoot}>
			<div className={styles.carouselViewport} ref={viewportRef} aria-roledescription="carousel">
				<button
					type="button"
					className={`${styles.navButton} ${styles.prev}`}
					onClick={goPrev}
					aria-label="Diapositiva anterior"
				>
					<ChevronLeft size={26} strokeWidth={2} aria-hidden />
				</button>
				<div
					className={styles.slidesTrack}
					style={{
						transform: `translate3d(${translateX}px, 0, 0)`,
						gap: `${SLIDE_GAP_PX}px`,
					}}
				>
					{slides.map((s, i) => (
						<section
							key={i}
							className={`${styles.slide} ${i === index ? styles.slideActive : styles.slideAdjacent}`}
							style={{
								flex: "0 0 auto",
								width: `${slideW}px`,
							}}
							aria-label={`${i + 1} de ${slides.length}`}
							aria-hidden={i !== index}
						>
							<div
								className={styles.slideBg}
								style={{ backgroundImage: `url('${s.imageUrl}')` }}
							/>
							<div className={styles.overlay} />
							<div className={styles.slideCard}>
								<h1 className={styles.slideTitle}>{s.title}</h1>
								<p className={styles.slideDescription}>{s.description}</p>
							</div>
						</section>
					))}
				</div>
				<button
					type="button"
					className={`${styles.navButton} ${styles.next}`}
					onClick={goNext}
					aria-label="Diapositiva siguiente"
				>
					<ChevronRight size={26} strokeWidth={2} aria-hidden />
				</button>
			</div>

			<div
				className={styles.dots}
				role="tablist"
				aria-label="Selector de diapositivas"
			>
				{slides.map((_, i) => (
					<button
						key={i}
						type="button"
						className={styles.dot + (i === index ? ` ${styles.active}` : "")}
						onClick={() => goTo(i)}
						role="tab"
						aria-selected={i === index}
					/>
				))}
			</div>
		</div>
	);
}
