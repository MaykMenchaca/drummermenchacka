"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import styles from "./HeroSection.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1];

// Variantes del contenido (entrada escalonada al cargar la página).
const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_OUT },
  },
};

// Línea dorada que se "dibuja": scaleX de 0 -> 1 (solo transform).
const goldLine = {
  hidden: { opacity: 0, scaleX: 0 },
  visible: {
    opacity: 1,
    scaleX: 1,
    transition: { duration: 0.7, ease: EASE_OUT, delay: 0.55 },
  },
};

export default function HeroSection() {
  const reduce = useReducedMotion();
  const sectionRef = useRef(null);

  // Progreso de scroll relativo a la sección para el parallax por capas.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Fondo más lento que el contenido. Si reduced-motion, sin desplazamiento.
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "22%"]);
  const contentY = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", reduce ? "0%" : "-8%"]
  );
  const contentOpacity = useTransform(
    scrollYProgress,
    [0, 0.7, 1],
    [1, 1, reduce ? 1 : 0.2]
  );

  return (
    <section className={styles.hero} ref={sectionRef}>
      {/* Capa de imagen con parallax (más lenta). */}
      <motion.div
        className={styles.media}
        style={{ y: bgY }}
        aria-hidden="true"
      >
        <Image
          src="/tattoos/999_mejorada.jpeg"
          alt=""
          className={styles.mediaImg}
          fill
          priority
          sizes="100vw"
        />
      </motion.div>

      {/* Viñeta / gradiente radial para legibilidad. */}
      <div className={styles.vignette} aria-hidden="true" />

      {/* Contenido centrado con entrada escalonada. */}
      <motion.div
        className={styles.inner}
        style={{ y: contentY, opacity: contentOpacity }}
      >
        <motion.div
          className="container"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            className={`label-caps text-gold ${styles.eyebrow}`}
            variants={item}
          >
            Fine Art &amp; Precision Ink
          </motion.p>

          <motion.h1 className={styles.headline} variants={item}>
            Drummer Menchacka
          </motion.h1>

          {/* Acento dorado que se dibuja. */}
          <motion.span
            className={styles.goldRule}
            variants={goldLine}
            aria-hidden="true"
          />

          <motion.p className={styles.subtitle} variants={item}>
            Tatuajes personalizados de alta costura, grabados para la eternidad.
            Cada trazo, sombra y linea se trabaja con precision quirurgica.
          </motion.p>

          <motion.div className={styles.actions} variants={item}>
            <Link href="/citas" className="btn btn-primary">
              Agendar cita
            </Link>
            <a href="#portfolio" className="btn btn-secondary">
              Ver portafolio
            </a>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Indicador de scroll con loop sutil. */}
      <motion.a
        href="#portfolio"
        className={styles.scrollHint}
        aria-label="Desplazarse al portafolio"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.6, ease: EASE_OUT }}
      >
        <span className={`label-caps ${styles.scrollHintLabel}`}>Scroll</span>
        <motion.span
          className={styles.scrollHintLine}
          aria-hidden="true"
          animate={
            reduce
              ? {}
              : { y: [0, 8, 0], opacity: [0.3, 1, 0.3] }
          }
          transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
        />
      </motion.a>
    </section>
  );
}
