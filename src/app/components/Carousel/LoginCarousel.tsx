"use client";

import React, { useEffect } from "react";
import { ANALYTICS_EVENTS, trackPublicEvent } from "@/app/services/analyticsService";
import styles from "./LoginCarousel.module.css";

let loginPageTracked = false;

export default function LoginCarousel() {
	useEffect(() => {
		if (loginPageTracked) return;
		loginPageTracked = true;
		trackPublicEvent(ANALYTICS_EVENTS.LOGIN_PAGE_VIEWED);
	}, []);

	return (
		<div className={styles.root}>
			<article className={styles.poster}>
				<img
					src="/images/login-quienes-somos.png"
					alt="Manos que se acercan, una con guante clínico"
					className={styles.photo}
				/>
				<div className={styles.veil} />

				<div className={styles.copy}>
					<p className={styles.kicker}>El cuidado, más cerca</p>
					<h2 className={styles.headline}>La salud, a un toque</h2>
					<p className={styles.support}>
						Cuando la salud del paciente está en juego,{' '}
						<strong>todo</strong> tiene que estar ahí, al alcance de la mano:{' '}
						<strong>historia clínica</strong>, <strong>medicaciones</strong> y{' '}
						<strong>agendas</strong>,{' '}
						<span className={styles.highlight}>listas para atender</span>.
					</p>
				</div>

				<div className={styles.brand}>
					<div className={styles.brandText}>
						<span>iMedic</span>
						<a
							href="https://isource.vercel.app/"
							target="_blank"
							rel="noopener noreferrer"
							className={styles.brandBy}
						>
							by iSource
						</a>
					</div>
				</div>
			</article>
		</div>
	);
}
