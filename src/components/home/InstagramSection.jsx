"use client";

// Seccion Instagram: tira de 6 posts + CTA.
// Consume INSTAGRAM_* (solo lectura) del contrato compartido.

import Image from "next/image";
import Icon from "@/components/Icon";
import Reveal, { RevealItem } from "@/components/Reveal";
import {
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  INSTAGRAM_POSTS,
} from "@/components/home/data";
import styles from "./InstagramSection.module.css";

export default function InstagramSection() {
  return (
    <section id="instagram" className={styles.instagram}>
      <div className="container">
        <Reveal className={styles.header}>
          <p className={`label-caps text-gold ${styles.eyebrow}`}>
            En el estudio
          </p>
          <h2 className={`title-large ${styles.title}`}>
            Síguelo en Instagram
          </h2>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.handle}
          >
            {INSTAGRAM_HANDLE}
          </a>
        </Reveal>

        <Reveal stagger className={styles.grid}>
          {INSTAGRAM_POSTS.map((post) => (
            <RevealItem key={post.id} className={styles.cell}>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
                aria-label={`Ver ${INSTAGRAM_HANDLE} en Instagram`}
              >
                <Image
                  src={post.image}
                  alt=""
                  className={styles.img}
                  fill
                  sizes="(max-width: 560px) 50vw, (max-width: 900px) 33vw, 16vw"
                />
                <span className={styles.overlay} aria-hidden="true">
                  <Icon name="instagram" size={28} />
                </span>
              </a>
            </RevealItem>
          ))}
        </Reveal>

        <Reveal className={styles.cta}>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Ver más en Instagram
          </a>
        </Reveal>
      </div>
    </section>
  );
}
