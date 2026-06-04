"use client";

// Wrapper de scroll-reveal compartido (Track A y Track B).
// Respeta prefers-reduced-motion: si está activo, no anima (muestra el contenido tal cual).
// API:
//   <Reveal>...</Reveal>                  -> fade-up de un bloque al entrar al viewport
//   <Reveal as="li" delay={0.1}>...        -> etiqueta y retraso personalizados
//   <Reveal stagger>...</Reveal>           -> contenedor que escalona la entrada de sus hijos
//   dentro de un stagger, envolver cada hijo con <RevealItem>...</RevealItem>

import { motion, useReducedMotion } from "framer-motion";

const DISTANCE = 24;

export default function Reveal({
  children,
  as = "div",
  delay = 0,
  y = DISTANCE,
  stagger = false,
  amount = 0.2,
  className,
  ...rest
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] || motion.div;

  if (stagger) {
    const container = {
      hidden: {},
      visible: {
        transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: delay },
      },
    };
    return (
      <MotionTag
        className={className}
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount }}
        {...rest}
      >
        {children}
      </MotionTag>
    );
  }

  const variants = {
    hidden: { opacity: 0, y: reduce ? 0 : y },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1], delay },
    },
  };

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

// Hijo de un contenedor <Reveal stagger>. Hereda el escalonado del padre.
export function RevealItem({ children, as = "div", y = DISTANCE, className, ...rest }) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] || motion.div;
  const variants = {
    hidden: { opacity: 0, y: reduce ? 0 : y },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  };
  return (
    <MotionTag className={className} variants={variants} {...rest}>
      {children}
    </MotionTag>
  );
}
