"use client";

import React, { useEffect, useState } from "react";
import { ChevronRight, Clock, Shield, Users } from "lucide-react";
import { ANALYTICS_EVENTS, trackPublicEvent } from "@/app/services/analyticsService";
import { HeartPulseMark } from "../Login/ImedicBrand";
import styles from "./LoginCarousel.module.css";

const SLIDES = [
	{
		image: "/images/login-hero.png",
		title: "Tecnología al servicio de la salud",
		text: "Conectamos pacientes y profesionales para una atención más simple, rápida y eficiente.",
	},
	{
		image: "/images/login-hero.png",
		title: "El cuidado, más cerca",
		text: "Historia clínica, medicaciones y agendas listas para atender, al alcance de la mano.",
	},
	{
		image: "/images/login-hero.png",
		title: "Atención coordinada",
		text: "Una plataforma pensada para que el consultorio funcione de forma simple, rápida y segura.",
	},
];

const FEATURES = [
	{ Icon: Shield, label: "Seguridad y privacidad" },
	{ Icon: Clock, label: "Acceso 24/7" },
	{ Icon: Users, label: "Gestión integral de tu consultorio" },
];

let loginPageTracked = false;

export default function LoginCarousel() {
	const [index, setIndex] = useState(0);
	const slide = SLIDES[index];

	useEffect(() => {
		if (loginPageTracked) return;
		loginPageTracked = true;
		trackPublicEvent(ANALYTICS_EVENTS.LOGIN_PAGE_VIEWED);
	}, []);

	const next = () => setIndex((current) => (current + 1) % SLIDES.length);

	return (
		<div className={styles.root}>
			<article className={styles.poster}>
				{SLIDES.map((item, i) => (
					<img
						key={`${item.title}-${i}`}
						src={item.image}
						alt=""
						className={`${styles.photo} ${i === index ? styles.photoVisible : ""}`}
					/>
				))}
				<div className={styles.veil} />

				<div className={styles.mark}>
					<HeartPulseMark size={34} title="iMedic" />
				</div>

				<div className={styles.copy} aria-live="polite">
					<h2 className={styles.headline}>{slide.title}</h2>
					<span className={styles.rule} aria-hidden />
					<p className={styles.support}>{slide.text}</p>
				</div>

				<button
					type="button"
					className={styles.next}
					onClick={next}
					aria-label="Siguiente"
				>
					<ChevronRight size={22} strokeWidth={2.2} />
				</button>

				<ul className={styles.features}>
					{FEATURES.map(({ Icon, label }) => (
						<li key={label} className={styles.feature}>
							<Icon size={22} strokeWidth={1.7} aria-hidden />
							<span>{label}</span>
						</li>
					))}
				</ul>
			</article>
		</div>
	);
}
