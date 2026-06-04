"use client";

// Seccion FAQ: acordeon accesible (uno abierto a la vez).
// Consume FAQS (solo lectura) del contrato compartido.

import { useState, useId } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";
import { FAQS } from "@/components/home/data";
import styles from "./FaqSection.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1];

export default function FaqSection() {
  const [open, setOpen] = useState(-1);
  const reduce = useReducedMotion();
  const baseId = useId();

  return (
    <section id="faq" className={styles.faq}>
      <div className="container">
        <Reveal className={styles.header}>
          <p className={`label-caps text-gold ${styles.eyebrow}`}>
            Dudas frecuentes
          </p>
          <h2 className={`title-large ${styles.title}`}>Preguntas frecuentes</h2>
        </Reveal>

        <Reveal className={styles.list}>
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            const btnId = `${baseId}-faq-btn-${i}`;
            const panelId = `${baseId}-faq-panel-${i}`;
            return (
              <div key={faq.q} className={styles.item}>
                <h3 className={styles.qHeading}>
                  <button
                    type="button"
                    id={btnId}
                    className={styles.question}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                  >
                    <span className={styles.qText}>{faq.q}</span>
                    <span className={styles.qIcon} aria-hidden="true">
                      <Icon name={isOpen ? "minus" : "plus"} size={20} />
                    </span>
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="panel"
                      id={panelId}
                      role="region"
                      aria-labelledby={btnId}
                      className={styles.panel}
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{
                        duration: reduce ? 0 : 0.28,
                        ease: EASE_OUT,
                      }}
                      style={{ overflow: "hidden" }}
                    >
                      <p className={styles.answer}>{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
