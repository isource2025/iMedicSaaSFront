"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./LoginCarousel.module.css";

type Slide = {
  imageUrl: string;
  title: string;
  description: string;
};

const AUTO_INTERVAL_MS = 6000;

export default function LoginCarousel() {
  const slides: Slide[] = useMemo(
    () => [
      {
        imageUrl:
          "https://i.pinimg.com/736x/c4/8e/f4/c48ef4a6394486a0b7ca4618a0dafd57.jpg",
        title: "Tecnología al servicio de la salud",
        description: "Optimiza procesos clínicos con información en tiempo real.",
      },
      {
        imageUrl:
          "https://i.pinimg.com/736x/03/20/eb/0320eb09d3c88ec1cbf0ef7efcaec393.jpg",
        title: "Gestión integral del paciente",
        description: "Historia clínica, internación y análisis en un mismo lugar.",
      },
      {
        imageUrl:
          "https://i.pinimg.com/736x/65/fb/e4/65fbe47563d0b2f30b7aa827870e7bb1.jpg",
        title: "Decisiones basadas en datos",
        description: "Indicadores y tableros para mejorar la calidad asistencial.",
      },
    ],
    []
  );

  const [index, setIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, AUTO_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length]);

  const goTo = (i: number) => setIndex(i % slides.length);
  

  // Cálculos de estilo para ancho del track y desplazamiento por slide
  const trackWidth = `${slides.length * 100}%`;
  const translatePercent = -(index * (100 / slides.length));

  return (
    <div className={styles.carouselRoot} aria-roledescription="carousel">
      <div
        className={styles.slidesTrack}
        style={{ width: trackWidth, transform: `translateX(${translatePercent}%)` }}
      >
        {slides.map((s, i) => (
          <section
            key={i}
            className={styles.slide}
            style={{
              backgroundImage: `url('${s.imageUrl}')`,
              width: `${100 / slides.length}%`,
            }}
            aria-label={`${i + 1} de ${slides.length}`}
          >
            <div className={styles.overlay} />
            <div className={styles.slideContent}>
              <h1 className={styles.slideTitle}>{s.title}</h1>
              <p className={styles.slideDescription}>{s.description}</p>
            </div>
          </section>
        ))}
      </div>
      
      <div className={styles.dots} role="tablist" aria-label="Selector de diapositivas">
        {slides.map((_, i) => (
          <button
            key={i}
            className={styles.dot + (i === index ? " " + styles.active : "")}
            onClick={() => goTo(i)}
            role="tab"
            aria-selected={i === index}
            aria-controls={`slide-${i}`}
          />
        ))}
      </div>

      {/* <footer className={styles.brandsFooter} aria-label="Marcas aliadas">
        <div className={styles.brandsTrack}>
           <span className={styles.brandItem}>Hospital Central</span>
          <span className={styles.brandItem}>Clínica del Sur</span>
          <span className={styles.brandItem}>Sanatorio Norte</span>
          <span className={styles.brandItem}>Hospital Provincial</span> 
        </div>
      </footer> */}
      
    </div>
  );
}
