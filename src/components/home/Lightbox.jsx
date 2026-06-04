"use client";

// Lightbox de galería para el portafolio.
// Overlay a pantalla completa (glass), navegación ← / →, Esc cierra,
// click en el fondo cierra, focus trap + bloqueo de scroll del body.
// Animación de entrada/salida con AnimatePresence (respeta reduced-motion).

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Icon from "@/components/Icon";
import styles from "./Lightbox.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1];

export default function Lightbox({ items, index, onClose, onIndexChange }) {
  const reduce = useReducedMotion();
  const isOpen = index !== null && index !== undefined && items && items.length > 0;

  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);
  // Guardamos el elemento que tenía el foco para restaurarlo al cerrar.
  const lastFocusedRef = useRef(null);

  const current = isOpen ? items[index] : null;
  const hasMany = isOpen && items.length > 1;

  const goPrev = useCallback(() => {
    if (!hasMany) return;
    onIndexChange((index - 1 + items.length) % items.length);
  }, [hasMany, index, items, onIndexChange]);

  const goNext = useCallback(() => {
    if (!hasMany) return;
    onIndexChange((index + 1) % items.length);
  }, [hasMany, index, items, onIndexChange]);

  // Teclado: Esc cierra, flechas navegan, Tab queda atrapado dentro del diálogo.
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, goPrev, goNext]);

  // Bloqueo de scroll del body + manejo de foco al abrir/cerrar.
  useEffect(() => {
    if (!isOpen) return;

    lastFocusedRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Llevar el foco al botón de cerrar al abrir.
    const focusTimer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
      // Restaurar el foco al elemento que abrió el lightbox.
      const last = lastFocusedRef.current;
      if (last && typeof last.focus === "function") {
        last.focus();
      }
    };
  }, [isOpen]);

  // Click en el fondo (no en la imagen ni controles) cierra.
  function onOverlayMouseDown(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  const overlayMotion = reduce
    ? { initial: false, animate: {}, exit: {} }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.22, ease: EASE_OUT },
      };

  const figureMotion = reduce
    ? { initial: false, animate: {}, exit: {} }
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.98 },
        transition: { duration: 0.28, ease: EASE_OUT },
      };

  return (
    <AnimatePresence>
      {isOpen && current && (
        <motion.div
          className={styles.overlay}
          onMouseDown={onOverlayMouseDown}
          {...overlayMotion}
        >
          <div
            className={styles.dialog}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Galería: ${current.title}`}
          >
            <button
              type="button"
              ref={closeBtnRef}
              className={styles.close}
              onClick={onClose}
              aria-label="Cerrar galería"
            >
              <Icon name="close" size={26} />
            </button>

            {hasMany && (
              <button
                type="button"
                className={`${styles.nav} ${styles.navPrev}`}
                onClick={goPrev}
                aria-label="Imagen anterior"
              >
                <Icon name="arrowLeft" size={26} />
              </button>
            )}

            <motion.figure className={styles.figure} {...figureMotion}>
              <span className={styles.imageFrame}>
                <Image
                  key={current.id}
                  src={current.image}
                  alt={current.title}
                  className={styles.image}
                  fill
                  sizes="min(100vw, 1100px)"
                />
              </span>
              <figcaption className={styles.caption}>
                <h3 className={styles.captionTitle}>{current.title}</h3>
                <p className={styles.captionMeta}>
                  <span className="text-gold">{current.category}</span>
                  <span className={styles.captionDot} aria-hidden="true">
                    ·
                  </span>
                  <span>{current.hours}</span>
                </p>
                {hasMany && (
                  <p className={styles.counter}>
                    {index + 1} / {items.length}
                  </p>
                )}
              </figcaption>
            </motion.figure>

            {hasMany && (
              <button
                type="button"
                className={`${styles.nav} ${styles.navNext}`}
                onClick={goNext}
                aria-label="Imagen siguiente"
              >
                <Icon name="arrowRight" size={26} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
