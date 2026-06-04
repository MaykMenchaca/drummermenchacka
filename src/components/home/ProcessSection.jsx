"use client";

// Seccion "Como funciona": 4 pasos del proceso con iconos dorados.
// Consume PROCESS_STEPS (solo lectura) del contrato compartido.

import Icon from "@/components/Icon";
import Reveal, { RevealItem } from "@/components/Reveal";
import { PROCESS_STEPS } from "@/components/home/data";
import styles from "./ProcessSection.module.css";

export default function ProcessSection() {
  return (
    <section id="process" className={styles.process}>
      <div className="container">
        <Reveal className={styles.header}>
          <p className={`label-caps text-gold ${styles.eyebrow}`}>El proceso</p>
          <h2 className={`title-large ${styles.title}`}>Cómo funciona</h2>
        </Reveal>

        <Reveal stagger className={styles.grid}>
          {PROCESS_STEPS.map((step) => (
            <RevealItem key={step.n} className={styles.card}>
              <span className={styles.number} aria-hidden="true">
                {step.n}
              </span>
              <span className={styles.iconWrap} aria-hidden="true">
                <Icon name={step.icon} size={28} />
              </span>
              <h3 className={styles.cardTitle}>{step.title}</h3>
              <p className={styles.cardText}>{step.text}</p>
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
